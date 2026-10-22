import "server-only";
import type { PoolClient } from "pg";
import { AppError } from "@/server/api/errors/app-error";
import { withTenantClient } from "@/server/database/tenant-pool";
import type { AuthorizedTenant, Role } from "@/server/auth/authorization";
import { mapRecipe } from "./recipe-mapper";
import type { RecipeInput } from "./recipe-types";
import * as repository from "./recipe-repository";

const MANAGER_ROLES = new Set<Role>(["OWNER", "ADMIN"]);
function requireManager(tenant: AuthorizedTenant) {
  if (!MANAGER_ROLES.has(tenant.role)) {
    throw new AppError("You do not have permission for this operation.", 403, "FORBIDDEN");
  }
}

function assertValidReferences(refs: Awaited<ReturnType<typeof repository.findRecipeReferences>>) {
  if (!refs.yieldUnitFound) throw new AppError("Yield unit not found.", 422, "INVALID_UNIT");
  for (const reference of refs.references) {
    if (!reference.ingredientFound) throw new AppError("Recipe ingredient not found.", 422, "INVALID_INGREDIENT");
    if (!reference.unitFound) throw new AppError("Recipe measurement unit not found.", 422, "INVALID_UNIT");
  }
}

async function load(client: PoolClient, id: string) {
  const result = await repository.findRecipe(client, id);
  if (!result) throw new AppError("Recipe not found.", 404, "NOT_FOUND");
  return mapRecipe(result.header, result.ingredients);
}

export async function createRecipe(tenant: AuthorizedTenant, input: RecipeInput) {
  requireManager(tenant);
  return withTenantClient(tenant, async (client) => {
    assertValidReferences(await repository.findRecipeReferences(client, input));
    const id = await repository.insertRecipe(client, input);
    for (const item of input.ingredients) await repository.insertRecipeIngredient(client, id, item);
    return load(client, id);
  });
}

export async function replaceRecipe(tenant: AuthorizedTenant, id: string, input: RecipeInput) {
  requireManager(tenant);
  return withTenantClient(tenant, async (client) => {
    if (!await repository.findRecipe(client, id, true)) throw new AppError("Recipe not found.", 404, "NOT_FOUND");
    assertValidReferences(await repository.findRecipeReferences(client, input));
    await repository.replaceRecipeHeader(client, id, input);
    await repository.deleteRecipeIngredients(client, id);
    for (const item of input.ingredients) await repository.insertRecipeIngredient(client, id, item);
    return load(client, id);
  });
}

export async function listRecipes(tenant: AuthorizedTenant, limit: number, offset: number, search?: string) {
  return withTenantClient(tenant, async (client) => {
    const page = await repository.listRecipeIds(client, limit, offset, search);
    const items = [];
    for (const id of page.ids) items.push(await load(client, id));
    return { items, total: page.total };
  });
}

export async function getRecipe(tenant: AuthorizedTenant, id: string) {
  return withTenantClient(tenant, (client) => load(client, id));
}

export async function updateRecipe(tenant: AuthorizedTenant, id: string, input: { name?: string; description?: string | null }) {
  requireManager(tenant);
  return withTenantClient(tenant, async (client) => {
    if (!await repository.updateRecipeDetails(client, id, input)) throw new AppError("Recipe not found.", 404, "NOT_FOUND");
    return load(client, id);
  });
}

export async function archiveRecipe(tenant: AuthorizedTenant, id: string) {
  requireManager(tenant);
  await withTenantClient(tenant, async (client) => {
    if (!await repository.archiveRecipe(client, id)) throw new AppError("Recipe not found.", 404, "NOT_FOUND");
  });
}
