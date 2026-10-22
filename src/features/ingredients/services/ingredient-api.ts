import { apiRequest, queryString, type Page } from "@/lib/api-client";
import type { Ingredient, CreateIngredientInput } from "../types/ingredient";

type IngredientUpdate = Partial<CreateIngredientInput>;

export function listIngredients(tenantId: string, options: { page?: number; limit?: number; search?: string } = {}) {
  return apiRequest<Page<Ingredient>>(`/api/v1/ingredients${queryString(options)}`, { tenantId });
}
export async function getIngredient(tenantId: string, id: string) {
  return (await apiRequest<{ data: Ingredient }>(`/api/v1/ingredients/${encodeURIComponent(id)}`, { tenantId })).data;
}
export async function createIngredient(tenantId: string, input: CreateIngredientInput, idempotencyKey: string) {
  return (await apiRequest<{ data: Ingredient }>("/api/v1/ingredients", { method: "POST", tenantId, headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) })).data;
}
export async function updateIngredient(tenantId: string, id: string, input: IngredientUpdate) {
  return (await apiRequest<{ data: Ingredient }>(`/api/v1/ingredients/${encodeURIComponent(id)}`, { method: "PATCH", tenantId, body: JSON.stringify(input) })).data;
}
export const archiveIngredient = (tenantId: string, id: string) => apiRequest<void>(`/api/v1/ingredients/${encodeURIComponent(id)}`, { method: "DELETE", tenantId });
