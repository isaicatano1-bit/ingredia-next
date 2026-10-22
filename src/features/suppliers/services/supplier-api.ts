import { apiRequest, queryString, type Page } from "@/lib/api-client";
import type { Supplier, SupplierInput } from "../types/supplier";
import type { SupplierIngredient, SupplierIngredientInput, SupplierIngredientUpdate } from "../types/supplier-ingredient";

export const listSuppliers = (tenantId: string, options: { page?: number; limit?: number; search?: string } = {}) =>
  apiRequest<Page<Supplier>>(`/api/v1/suppliers${queryString(options)}`, { tenantId });
export async function createSupplier(tenantId: string, input: SupplierInput, idempotencyKey: string) {
  return (await apiRequest<{ data: Supplier }>("/api/v1/suppliers", { method: "POST", tenantId, headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) })).data;
}
export async function getSupplier(tenantId: string, id: string) {
  return (await apiRequest<{ data: Supplier }>(`/api/v1/suppliers/${encodeURIComponent(id)}`, { tenantId })).data;
}
export async function updateSupplier(tenantId: string, id: string, input: Partial<SupplierInput>) {
  return (await apiRequest<{ data: Supplier }>(`/api/v1/suppliers/${encodeURIComponent(id)}`, { method: "PATCH", tenantId, body: JSON.stringify(input) })).data;
}
export const archiveSupplier = (tenantId: string, id: string) => apiRequest<void>(`/api/v1/suppliers/${encodeURIComponent(id)}`, { method: "DELETE", tenantId });

export const listSupplierIngredients = (tenantId: string, options: { page?: number; limit?: number; supplierId?: string; ingredientId?: string } = {}) =>
  apiRequest<Page<SupplierIngredient>>(`/api/v1/supplier-ingredients${queryString(options)}`, { tenantId });
export async function createSupplierIngredient(tenantId: string, input: SupplierIngredientInput) {
  return (await apiRequest<{ data: SupplierIngredient }>("/api/v1/supplier-ingredients", { method: "POST", tenantId, body: JSON.stringify(input) })).data;
}
export async function getSupplierIngredient(tenantId: string, id: string) {
  return (await apiRequest<{ data: SupplierIngredient }>(`/api/v1/supplier-ingredients/${encodeURIComponent(id)}`, { tenantId })).data;
}
export async function updateSupplierIngredient(tenantId: string, id: string, input: SupplierIngredientUpdate) {
  return (await apiRequest<{ data: SupplierIngredient }>(`/api/v1/supplier-ingredients/${encodeURIComponent(id)}`, { method: "PATCH", tenantId, body: JSON.stringify(input) })).data;
}
export const deleteSupplierIngredient = (tenantId: string, id: string) => apiRequest<void>(`/api/v1/supplier-ingredients/${encodeURIComponent(id)}`, { method: "DELETE", tenantId });
