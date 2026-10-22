import { apiRequest, queryString, type Page } from "@/lib/api-client";
import type { Purchase, PurchaseInput, PurchaseStatus, PurchaseUpdate } from "../types/purchase";

export const listPurchases = (tenantId: string, options: { page?: number; limit?: number; status?: PurchaseStatus } = {}) =>
  apiRequest<Page<Purchase>>(`/api/v1/purchases${queryString(options)}`, { tenantId });
export async function createPurchase(tenantId: string, input: PurchaseInput, idempotencyKey: string) {
  return (await apiRequest<{ data: Purchase }>("/api/v1/purchases", { method: "POST", tenantId, headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) })).data;
}
export async function getPurchase(tenantId: string, id: string) {
  return (await apiRequest<{ data: Purchase }>(`/api/v1/purchases/${encodeURIComponent(id)}`, { tenantId })).data;
}
export async function updatePurchase(tenantId: string, id: string, input: PurchaseUpdate) {
  return (await apiRequest<{ data: Purchase }>(`/api/v1/purchases/${encodeURIComponent(id)}`, { method: "PATCH", tenantId, body: JSON.stringify(input) })).data;
}
export const deletePurchase = (tenantId: string, id: string) => apiRequest<void>(`/api/v1/purchases/${encodeURIComponent(id)}`, { method: "DELETE", tenantId });
export async function confirmPurchase(tenantId: string, id: string) {
  return (await apiRequest<{ data: Purchase }>(`/api/v1/purchases/${encodeURIComponent(id)}/confirm`, { method: "POST", tenantId })).data;
}
