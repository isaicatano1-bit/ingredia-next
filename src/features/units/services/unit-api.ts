import { apiRequest, queryString, type Page } from "@/lib/api-client";
import type { MeasurementType, Unit, UnitInput } from "../types/unit";
export const listUnits = (tenantId: string, options: { page?: number; limit?: number; type?: MeasurementType } = {}) =>
  apiRequest<Page<Unit>>(`/api/v1/units${queryString(options)}`, { tenantId });
export async function createUnit(tenantId: string, input: UnitInput) {
  return (await apiRequest<{ data: Unit }>("/api/v1/units", { method: "POST", tenantId, body: JSON.stringify(input) })).data;
}
export async function getUnit(tenantId: string, id: string) {
  return (await apiRequest<{ data: Unit }>(`/api/v1/units/${encodeURIComponent(id)}`, { tenantId })).data;
}
export async function updateUnit(tenantId: string, id: string, input: Partial<Omit<UnitInput, "measurementType">>) {
  return (await apiRequest<{ data: Unit }>(`/api/v1/units/${encodeURIComponent(id)}`, { method: "PATCH", tenantId, body: JSON.stringify(input) })).data;
}
export const deleteUnit = (tenantId: string, id: string) => apiRequest<void>(`/api/v1/units/${encodeURIComponent(id)}`, { method: "DELETE", tenantId });
