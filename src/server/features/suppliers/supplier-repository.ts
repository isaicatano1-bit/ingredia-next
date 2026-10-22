import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { AppError } from "@/server/api/errors/app-error";
import { withTenantClient } from "@/server/database/tenant-pool";
import type { TenantContext } from "@/server/tenancy/tenant-context";

export type SupplierInput = { name: string; contactName?: string; email?: string; phone?: string };
export type Supplier = SupplierInput & { id: string; createdAt: string };
type Row = { id: string; name: string; contact_name: string | null; email: string | null; phone: string | null; created_at: Date };
const dto = (r: Row): Supplier => ({ id: r.id, name: r.name, contactName: r.contact_name ?? undefined, email: r.email ?? undefined, phone: r.phone ?? undefined, createdAt: r.created_at.toISOString() });
const fields = "id,name,contact_name,email,phone,created_at";

export async function createSupplier(tenant: TenantContext, input: SupplierInput, idempotencyKey: string): Promise<{ supplier: Supplier; replayed: boolean; status: number }> {
  return withTenantClient(tenant, async (client: PoolClient) => {
    const op = "suppliers.create.v1";
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`${tenant.tenantId}:${op}:${idempotencyKey}`]);
    const previous = await client.query<{ request_hash: string; response_status: number | null; response_body: Supplier | null; expires_at: Date }>("SELECT request_hash,response_status,response_body,expires_at FROM public.idempotency_records WHERE tenant_id=$1 AND operation=$2 AND key=$3 FOR UPDATE", [tenant.tenantId, op, idempotencyKey]);
    if (previous.rows[0]?.expires_at > new Date()) {
      if (previous.rows[0].request_hash !== hash) throw new AppError("Idempotency key was already used with a different request.", 409, "IDEMPOTENCY_CONFLICT");
      if (previous.rows[0].response_body) return { supplier: previous.rows[0].response_body, replayed: true, status: previous.rows[0].response_status ?? 201 };
      throw new AppError("An operation with this key is still being processed.", 409, "IDEMPOTENCY_IN_PROGRESS");
    }
    if (previous.rows[0]) await client.query("DELETE FROM public.idempotency_records WHERE tenant_id=$1 AND operation=$2 AND key=$3", [tenant.tenantId, op, idempotencyKey]);
    await client.query("INSERT INTO public.idempotency_records(tenant_id,operation,key,request_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '24 hours')", [tenant.tenantId, op, idempotencyKey, hash]);
    const result = await client.query<Row>("INSERT INTO suppliers(name,contact_name,email,phone) VALUES($1,$2,$3,$4) RETURNING " + fields, [input.name, input.contactName ?? null, input.email?.toLowerCase() ?? null, input.phone ?? null]);
    const supplier = dto(result.rows[0]);
    await client.query("UPDATE public.idempotency_records SET response_status=201,response_body=$4 WHERE tenant_id=$1 AND operation=$2 AND key=$3", [tenant.tenantId, op, idempotencyKey, JSON.stringify(supplier)]);
    return { supplier, replayed: false, status: 201 };
  });
}

export async function listSuppliers(tenant: TenantContext, limit: number, offset: number, search?: string) {
  return withTenantClient(tenant, async (client) => {
    const pattern = search ? `%${search}%` : null;
    const [rows, count] = await Promise.all([
      client.query<Row>(`SELECT ${fields} FROM suppliers WHERE archived_at IS NULL AND ($3::text IS NULL OR name ILIKE $3) ORDER BY name LIMIT $1 OFFSET $2`, [limit, offset, pattern]),
      client.query<{ total: string }>("SELECT count(*)::text total FROM suppliers WHERE archived_at IS NULL AND ($1::text IS NULL OR name ILIKE $1)", [pattern]),
    ]);
    return { items: rows.rows.map(dto), total: Number(count.rows[0].total) };
  });
}

export async function getSupplier(tenant: TenantContext, id: string): Promise<Supplier> {
  return withTenantClient(tenant, async (client) => {
    const row = await client.query<Row>(`SELECT ${fields} FROM suppliers WHERE id=$1 AND archived_at IS NULL`, [id]);
    if (!row.rows[0]) throw new AppError("Supplier not found.", 404, "NOT_FOUND");
    return dto(row.rows[0]);
  });
}

export async function updateSupplier(tenant: TenantContext, id: string, input: Partial<SupplierInput>): Promise<Supplier> {
  return withTenantClient(tenant, async (client) => {
    const row = await client.query("UPDATE suppliers SET name=COALESCE($2,name),contact_name=COALESCE($3,contact_name),email=COALESCE($4,email),phone=COALESCE($5,phone),updated_at=now() WHERE id=$1 AND archived_at IS NULL RETURNING id", [id,input.name ?? null,input.contactName ?? null,input.email?.toLowerCase() ?? null,input.phone ?? null]);
    if (!row.rowCount) throw new AppError("Supplier not found.", 404, "NOT_FOUND");
    const result = await client.query<Row>(`SELECT ${fields} FROM suppliers WHERE id=$1`, [id]);
    return dto(result.rows[0]);
  });
}

export async function archiveSupplier(tenant: TenantContext, id: string): Promise<void> {
  await withTenantClient(tenant, async (client) => {
    const row = await client.query("UPDATE suppliers SET archived_at=now(),updated_at=now() WHERE id=$1 AND archived_at IS NULL", [id]);
    if (!row.rowCount) throw new AppError("Supplier not found.", 404, "NOT_FOUND");
  });
}
