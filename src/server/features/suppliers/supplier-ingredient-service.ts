import "server-only";
import { AppError } from "@/server/api/errors/app-error";
import { withTenantClient } from "@/server/database/tenant-pool";
import type { AuthorizedTenant, Role } from "@/server/auth/authorization";
import type { SupplierIngredientInput } from "./supplier-ingredient-types";
import { mapSupplierIngredient } from "./supplier-ingredient-mapper";
import * as repository from "./supplier-ingredient-repository";

const MANAGER_ROLES = new Set<Role>(["OWNER", "ADMIN"]);
function requireManager(tenant: AuthorizedTenant) {
  if (!MANAGER_ROLES.has(tenant.role)) {
    throw new AppError("You do not have permission for this operation.", 403, "FORBIDDEN");
  }
}

function validateUnitCompatibility(refs: { measurement_type: string; ingredient_measurement_type: string } | undefined) {
  if (!refs) throw new AppError("Supplier, ingredient, or purchase unit was not found in this tenant.", 422, "INVALID_REFERENCE");
  if (refs.measurement_type !== refs.ingredient_measurement_type) {
    throw new AppError("Purchase unit must have the same measurement type as the ingredient purchase unit.", 422, "INCOMPATIBLE_UNIT");
  }
}

export async function listSupplierIngredients(tenant: AuthorizedTenant, options: { limit: number; offset: number; supplierId?: string; ingredientId?: string }) {
  return withTenantClient(tenant, async (client) => {
    const result = await repository.listSupplierIngredients(client, options);
    return { items: result.rows.map(mapSupplierIngredient), total: result.total };
  });
}

export async function getSupplierIngredient(tenant: AuthorizedTenant, id: string) {
  return withTenantClient(tenant, async (client) => {
    const row = await repository.findSupplierIngredient(client, id);
    if (!row) throw new AppError("Supplier-ingredient relationship not found.", 404, "NOT_FOUND");
    return mapSupplierIngredient(row);
  });
}

export async function createSupplierIngredient(tenant: AuthorizedTenant, input: Required<Pick<SupplierIngredientInput, "supplierId" | "ingredientId" | "purchaseUnitId">> & SupplierIngredientInput) {
  requireManager(tenant);
  return withTenantClient(tenant, async (client) => {
    const refs = await repository.findSupplierIngredientReferences(client, input.supplierId, input.ingredientId, input.purchaseUnitId);
    validateUnitCompatibility(refs.rows[0]);
    const id = await repository.insertSupplierIngredient(client, input);
    const row = await repository.findSupplierIngredient(client, id);
    if (!row) throw new Error("Created supplier-ingredient relationship could not be loaded");
    return mapSupplierIngredient(row);
  });
}

export async function updateSupplierIngredient(tenant: AuthorizedTenant, id: string, input: SupplierIngredientInput) {
  requireManager(tenant);
  return withTenantClient(tenant, async (client) => {
    const current = await repository.findSupplierIngredient(client, id, true);
    if (!current) throw new AppError("Supplier-ingredient relationship not found.", 404, "NOT_FOUND");
    const purchaseUnitId = input.purchaseUnitId ?? current.purchase_unit_id;
    if (input.purchaseUnitId) {
      const refs = await repository.findSupplierIngredientReferences(client, current.supplier_id, current.ingredient_id, purchaseUnitId);
      validateUnitCompatibility(refs.rows[0]);
    }
    await repository.updateSupplierIngredient(client, id, { ...input, purchaseUnitId });
    const updated = await repository.findSupplierIngredient(client, id);
    if (!updated) throw new Error("Updated supplier-ingredient relationship could not be loaded");
    return mapSupplierIngredient(updated);
  });
}

export async function deleteSupplierIngredient(tenant: AuthorizedTenant, id: string) {
  requireManager(tenant);
  return withTenantClient(tenant, async (client) => {
    if (!await repository.deleteSupplierIngredient(client, id)) {
      throw new AppError("Supplier-ingredient relationship not found.", 404, "NOT_FOUND");
    }
  });
}
