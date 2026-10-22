import "server-only";
import type { PoolClient } from "pg";
import type { SupplierDto, SupplierInput } from "./supplier-types";
import type { SupplierRow } from "./supplier-mapper";

const FIELDS = "id,name,contact_name,email,phone,created_at";

export async function lockIdempotencyKey(client: PoolClient, scope: string) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [scope]);
}

export async function findIdempotencyRecord(client: PoolClient, tenantId: string, operation: string, key: string) {
  const result = await client.query<{request_hash:string;response_status:number|null;response_body:SupplierDto|null;expires_at:Date}>(
    "SELECT request_hash,response_status,response_body,expires_at FROM public.idempotency_records WHERE tenant_id=$1 AND operation=$2 AND key=$3 FOR UPDATE",
    [tenantId,operation,key],
  );
  return result.rows[0] ?? null;
}

export async function deleteIdempotencyRecord(client: PoolClient, tenantId: string, operation: string, key: string) {
  await client.query("DELETE FROM public.idempotency_records WHERE tenant_id=$1 AND operation=$2 AND key=$3", [tenantId,operation,key]);
}

export async function insertIdempotencyRecord(client: PoolClient, tenantId: string, operation: string, key: string, hash: string) {
  await client.query(
    "INSERT INTO public.idempotency_records(tenant_id,operation,key,request_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '24 hours')",
    [tenantId,operation,key,hash],
  );
}

export async function saveIdempotencyResponse(client: PoolClient, tenantId: string, operation: string, key: string, body: SupplierDto) {
  await client.query(
    "UPDATE public.idempotency_records SET response_status=201,response_body=$4 WHERE tenant_id=$1 AND operation=$2 AND key=$3",
    [tenantId,operation,key,JSON.stringify(body)],
  );
}

export async function insertSupplier(client: PoolClient, input: SupplierInput) {
  const result = await client.query<SupplierRow>(
    `INSERT INTO suppliers(name,contact_name,email,phone) VALUES($1,$2,$3,$4) RETURNING ${FIELDS}`,
    [input.name,input.contactName??null,input.email?.toLowerCase()??null,input.phone??null],
  );
  return result.rows[0];
}

export async function listSuppliers(client: PoolClient, limit: number, offset: number, search?: string) {
  const pattern = search ? `%${search}%` : null;
  const [rows, count] = await Promise.all([
    client.query<SupplierRow>(`SELECT ${FIELDS} FROM suppliers WHERE archived_at IS NULL AND ($3::text IS NULL OR name ILIKE $3) ORDER BY name LIMIT $1 OFFSET $2`, [limit,offset,pattern]),
    client.query<{total:string}>("SELECT count(*)::text AS total FROM suppliers WHERE archived_at IS NULL AND ($1::text IS NULL OR name ILIKE $1)", [pattern]),
  ]);
  return { rows: rows.rows, total: Number(count.rows[0].total) };
}

export async function findSupplier(client: PoolClient,id: string) {
  const result = await client.query<SupplierRow>(`SELECT ${FIELDS} FROM suppliers WHERE id=$1 AND archived_at IS NULL`, [id]);
  return result.rows[0] ?? null;
}

export async function updateSupplier(client: PoolClient,id: string,input: Partial<SupplierInput>) {
  const result = await client.query(
    `UPDATE suppliers SET name=COALESCE($2,name),contact_name=COALESCE($3,contact_name),
      email=COALESCE($4,email),phone=COALESCE($5,phone),updated_at=now()
     WHERE id=$1 AND archived_at IS NULL RETURNING id`,
    [id,input.name??null,input.contactName??null,input.email?.toLowerCase()??null,input.phone??null],
  );
  return Boolean(result.rowCount);
}

export async function archiveSupplier(client: PoolClient,id: string) {
  const result = await client.query("UPDATE suppliers SET archived_at=now(),updated_at=now() WHERE id=$1 AND archived_at IS NULL", [id]);
  return Boolean(result.rowCount);
}
