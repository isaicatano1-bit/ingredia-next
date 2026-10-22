import "server-only";
import { createHash } from "node:crypto";
import { AppError } from "@/server/api/errors/app-error";
import { withTenantClient } from "@/server/database/tenant-pool";
import type { AuthorizedTenant, Role } from "@/server/auth/authorization";
import { mapSupplier } from "./supplier-mapper";
import type { SupplierDto, SupplierInput } from "./supplier-types";
import * as repository from "./supplier-repository";

const OPERATION = "suppliers.create.v1";
const MANAGER_ROLES = new Set<Role>(["OWNER", "ADMIN"]);

function requireManager(tenant: AuthorizedTenant) {
  if (!MANAGER_ROLES.has(tenant.role)) {
    throw new AppError("You do not have permission for this operation.", 403, "FORBIDDEN");
  }
}

export async function createSupplier(tenant: AuthorizedTenant,input: SupplierInput,idempotencyKey: string) {
  requireManager(tenant);
  return withTenantClient(tenant, async (client) => {
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    await repository.lockIdempotencyKey(client, `${tenant.tenantId}:${OPERATION}:${idempotencyKey}`);
    const previous = await repository.findIdempotencyRecord(client,tenant.tenantId,OPERATION,idempotencyKey);
    if (previous?.expires_at > new Date()) {
      if (previous.request_hash !== hash) throw new AppError("Idempotency key was already used with a different request.",409,"IDEMPOTENCY_CONFLICT");
      if (previous.response_body) return { supplier: previous.response_body, replayed: true, status: previous.response_status ?? 201 };
      throw new AppError("An operation with this key is still being processed.",409,"IDEMPOTENCY_IN_PROGRESS");
    }
    if (previous) await repository.deleteIdempotencyRecord(client,tenant.tenantId,OPERATION,idempotencyKey);
    await repository.insertIdempotencyRecord(client,tenant.tenantId,OPERATION,idempotencyKey,hash);
    const supplier = mapSupplier(await repository.insertSupplier(client,input));
    await repository.saveIdempotencyResponse(client,tenant.tenantId,OPERATION,idempotencyKey,supplier);
    return { supplier, replayed: false, status: 201 };
  });
}

export async function listSuppliers(tenant: AuthorizedTenant,limit: number,offset: number,search?: string) {
  return withTenantClient(tenant, async (client) => {
    const result = await repository.listSuppliers(client,limit,offset,search);
    return { items: result.rows.map(mapSupplier), total: result.total };
  });
}

export async function getSupplier(tenant: AuthorizedTenant,id: string): Promise<SupplierDto> {
  return withTenantClient(tenant, async (client) => {
    const row = await repository.findSupplier(client,id);
    if (!row) throw new AppError("Supplier not found.",404,"NOT_FOUND");
    return mapSupplier(row);
  });
}

export async function updateSupplier(tenant: AuthorizedTenant,id: string,input: Partial<SupplierInput>) {
  requireManager(tenant);
  return withTenantClient(tenant, async (client) => {
    if (!await repository.updateSupplier(client,id,input)) throw new AppError("Supplier not found.",404,"NOT_FOUND");
    const updated = await repository.findSupplier(client,id);
    if (!updated) throw new Error("Updated supplier could not be loaded");
    return mapSupplier(updated);
  });
}

export async function archiveSupplier(tenant: AuthorizedTenant,id: string) {
  requireManager(tenant);
  await withTenantClient(tenant, async (client) => {
    if (!await repository.archiveSupplier(client,id)) throw new AppError("Supplier not found.",404,"NOT_FOUND");
  });
}
