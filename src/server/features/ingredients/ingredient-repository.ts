import "server-only";
import type { PoolClient } from "pg";
import type { CreateIngredientInput } from "@/features/ingredients/types/ingredient";
import type { IngredientRow } from "./ingredient-mapper";

const SELECT_FIELDS = `i.id,i.name,i.purchase_unit_id,u.name AS unit_name,u.abbreviation,i.created_at`;
const SELECT_FROM = "FROM ingredients i JOIN units u ON u.id=i.purchase_unit_id";

export async function findPurchaseUnit(client: PoolClient,id: string) {
  const result = await client.query("SELECT 1 FROM units WHERE id=$1", [id]);
  return Boolean(result.rowCount);
}

export async function lockIdempotencyKey(client: PoolClient, scope: string) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [scope]);
}

export async function findIdempotencyRecord(client: PoolClient,tenantId: string,operation: string,key: string) {
  const result = await client.query<{request_hash:string;response_status:number|null;response_body:import("@/features/ingredients/types/ingredient").Ingredient|null;expires_at:Date}>(
    "SELECT request_hash,response_status,response_body,expires_at FROM public.idempotency_records WHERE tenant_id=$1 AND operation=$2 AND key=$3 FOR UPDATE",
    [tenantId,operation,key],
  );
  return result.rows[0] ?? null;
}

export async function deleteIdempotencyRecord(client: PoolClient,tenantId: string,operation: string,key: string) {
  await client.query("DELETE FROM public.idempotency_records WHERE tenant_id=$1 AND operation=$2 AND key=$3", [tenantId,operation,key]);
}

export async function insertIdempotencyRecord(client: PoolClient,tenantId: string,operation: string,key: string,hash: string) {
  await client.query("INSERT INTO public.idempotency_records(tenant_id,operation,key,request_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '24 hours')", [tenantId,operation,key,hash]);
}

export async function saveIdempotencyResponse(client: PoolClient,tenantId: string,operation: string,key: string,body: unknown) {
  await client.query("UPDATE public.idempotency_records SET response_status=201,response_body=$4 WHERE tenant_id=$1 AND operation=$2 AND key=$3", [tenantId,operation,key,JSON.stringify(body)]);
}

export async function insertIngredient(client: PoolClient,input: CreateIngredientInput) {
  const result = await client.query<{id:string}>("INSERT INTO ingredients(name,purchase_unit_id) VALUES($1,$2) RETURNING id", [input.name,input.purchaseUnitId]);
  return result.rows[0].id;
}

export async function findIngredient(client: PoolClient,id: string) {
  const result = await client.query<IngredientRow>(`${SELECT_FIELDS} ${SELECT_FROM} WHERE i.id=$1 AND i.archived_at IS NULL`, [id]);
  return result.rows[0] ?? null;
}

export async function listIngredients(client: PoolClient,options: {limit:number;offset:number;search?:string}) {
  const pattern = options.search ? `%${options.search}%` : null;
  const [rows,count] = await Promise.all([
    client.query<IngredientRow>(`${SELECT_FIELDS} ${SELECT_FROM} WHERE i.archived_at IS NULL AND ($3::text IS NULL OR i.name ILIKE $3) ORDER BY i.name LIMIT $1 OFFSET $2`, [options.limit,options.offset,pattern]),
    client.query<{total:string}>("SELECT count(*)::text AS total FROM ingredients WHERE archived_at IS NULL AND ($1::text IS NULL OR name ILIKE $1)", [pattern]),
  ]);
  return {rows:rows.rows,total:Number(count.rows[0].total)};
}

export async function updateIngredient(client: PoolClient,id: string,input: {name?:string;purchaseUnitId?:string}) {
  const result = await client.query(
    "UPDATE ingredients SET name=COALESCE($2,name),purchase_unit_id=COALESCE($3,purchase_unit_id),updated_at=now() WHERE id=$1 AND archived_at IS NULL RETURNING id",
    [id,input.name??null,input.purchaseUnitId??null],
  );
  return Boolean(result.rowCount);
}

export async function archiveIngredient(client: PoolClient,id: string) {
  const result = await client.query("UPDATE ingredients SET archived_at=now(),updated_at=now() WHERE id=$1 AND archived_at IS NULL", [id]);
  return Boolean(result.rowCount);
}
