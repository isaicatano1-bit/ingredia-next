import { apiRequest, queryString, type Page } from "@/lib/api-client";
import type { Recipe, RecipeInput } from "../types/recipe";

export const listRecipes = (tenantId: string, options: { page?: number; limit?: number; search?: string } = {}) =>
  apiRequest<Page<Recipe>>(`/api/v1/recipes${queryString(options)}`, { tenantId });
export async function createRecipe(tenantId: string, input: RecipeInput) {
  return (await apiRequest<{ data: Recipe }>("/api/v1/recipes", { method: "POST", tenantId, body: JSON.stringify(input) })).data;
}
export async function getRecipe(tenantId: string, id: string) {
  return (await apiRequest<{ data: Recipe }>(`/api/v1/recipes/${encodeURIComponent(id)}`, { tenantId })).data;
}
export async function updateRecipe(tenantId: string, id: string, input: { name?: string; description?: string | null }) {
  return (await apiRequest<{ data: Recipe }>(`/api/v1/recipes/${encodeURIComponent(id)}`, { method: "PATCH", tenantId, body: JSON.stringify(input) })).data;
}
export async function replaceRecipe(tenantId: string, id: string, input: RecipeInput) {
  return (await apiRequest<{ data: Recipe }>(`/api/v1/recipes/${encodeURIComponent(id)}`, { method: "PUT", tenantId, body: JSON.stringify(input) })).data;
}
export const archiveRecipe = (tenantId: string, id: string) => apiRequest<void>(`/api/v1/recipes/${encodeURIComponent(id)}`, { method: "DELETE", tenantId });
