import "server-only";
import type { CreateIngredientInput, Ingredient } from "@/features/ingredients/interfaces/ingredient";
import { createIngredient } from "@/server/features/ingredients/ingredient-repository";
import type { TenantContext } from "@/server/tenancy/tenant-context";

export function addIngredient(tenant: TenantContext, input: CreateIngredientInput): Promise<Ingredient> {
  return createIngredient(tenant, input);
}
