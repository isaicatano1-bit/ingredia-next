import { apiRequest } from "@/lib/api-client";

export type Credentials = { email: string; password: string };
export type SessionUser = { id: string; email: string };
export type TenantMembership = { id: string; name: string; role: "OWNER" | "ADMIN" | "MEMBER" };
export type CurrentUser = { user: SessionUser; tenants: TenantMembership[] };

export async function register(credentials: Credentials) {
  return (await apiRequest<{ data: { user: SessionUser } }>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(credentials) })).data;
}
export async function login(credentials: Credentials) {
  return (await apiRequest<{ data: { user: SessionUser } }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(credentials) })).data;
}
export const logout = () => apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
export async function getCurrentUser() {
  return (await apiRequest<{ data: CurrentUser }>("/api/v1/auth/me")).data;
}
export async function selectTenant(tenantId: string) {
  return (await apiRequest<{ data: { tenant: TenantMembership } }>("/api/v1/tenants/switch", {
    method: "POST", body: JSON.stringify({ tenantId }),
  })).data.tenant;
}
