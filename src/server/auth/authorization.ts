import "server-only";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/api/errors/app-error";
import { getCookie, readSession, SESSION_COOKIE } from "@/server/auth/session";
import { assertTenantId, schemaForTenantId, type TenantContext } from "@/server/tenancy/tenant-context";

export type Role = "OWNER" | "ADMIN" | "MEMBER";
export type AuthenticatedUser = { id: string; email: string };
export type AuthorizedTenant = TenantContext & { role: Role; name: string };

export async function authenticate(request: Request): Promise<AuthenticatedUser> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) throw new AppError("Authentication is required.", 401, "AUTH_REQUIRED");
  const id = await readSession(token);
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!user) throw new AppError("Authentication is required.", 401, "AUTH_REQUIRED");
  return user;
}

export async function resolveTenant(request: Request, requiredRoles?: Role[]): Promise<{ user: AuthenticatedUser; tenant: AuthorizedTenant }> {
  const user = await authenticate(request);
  const tenantId = request.headers.get("x-tenant-id") ?? new URL(request.url).searchParams.get("tenantId");
  if (!tenantId) throw new AppError("Select a tenant using x-tenant-id.", 400, "TENANT_REQUIRED");
  let normalizedTenantId: string;
  try { normalizedTenantId = assertTenantId(tenantId); } catch { throw new AppError("Invalid tenant selection.", 400, "INVALID_TENANT"); }
  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: normalizedTenantId } },
    select: { role: true, tenant: { select: { id: true, name: true, schemaName: true } } },
  });
  if (!membership || membership.tenant.schemaName !== schemaForTenantId(normalizedTenantId)) {
    throw new AppError("Tenant not found.", 404, "TENANT_NOT_FOUND");
  }
  const role = membership.role as Role;
  if (requiredRoles && !requiredRoles.includes(role)) throw new AppError("You do not have permission for this operation.", 403, "FORBIDDEN");
  return { user, tenant: { tenantId: normalizedTenantId, schemaName: membership.tenant.schemaName, role, name: membership.tenant.name } };
}
