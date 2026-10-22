import "server-only";
import type { PoolClient } from "pg";
import { createHash } from "node:crypto";
import type { CreateIngredientInput, Ingredient } from "@/features/ingredients/interfaces/ingredient";
import { AppError } from "@/server/api/errors/app-error";
import { withTenantClient } from "@/server/database/tenant-pool";
import type { TenantContext } from "@/server/tenancy/tenant-context";

type IngredientRow = { id: string; name: string; purchase_unit_id: string; unit_name: string; abbreviation: string; created_at: Date };
function dto(row: IngredientRow): Ingredient {
  return { id: row.id, name: row.name, purchaseUnitId: row.purchase_unit_id, purchaseUnit: { id: row.purchase_unit_id, name: row.unit_name, abbreviation: row.abbreviation }, createdAt: row.created_at.toISOString() };
}
const selectIngredient = `SELECT i.id, i.name, i.purchase_unit_id, u.name AS unit_name, u.abbreviation, i.created_at
  FROM ingredients i JOIN units u ON u.id = i.purchase_unit_id`;

export async function createIngredient(tenant: TenantContext, input: CreateIngredientInput, idempotencyKey: string): Promise<{ ingredient: Ingredient; replayed: boolean; status: number }> {
  return withTenantClient(tenant, async (client: PoolClient) => {
    const operation = "ingredients.create.v1";
    const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`${tenant.tenantId}:${operation}:${idempotencyKey}`]);
    const prior = await client.query<{ request_hash: string; response_status: number | null; response_body: Ingredient | null; expires_at: Date }>(
      `SELECT request_hash, response_status, response_body, expires_at FROM public.idempotency_records WHERE tenant_id=$1 AND operation=$2 AND key=$3 FOR UPDATE`,
      [tenant.tenantId, operation, idempotencyKey]);
    if (prior.rows[0]?.expires_at > new Date()) {
      if (prior.rows[0].request_hash !== requestHash) throw new AppError("Idempotency key was already used with a different request.", 409, "IDEMPOTENCY_CONFLICT");
      if (prior.rows[0].response_body) return { ingredient: prior.rows[0].response_body, replayed: true, status: prior.rows[0].response_status ?? 201 };
      throw new AppError("An operation with this key is still being processed.", 409, "IDEMPOTENCY_IN_PROGRESS");
    }
    if (prior.rows[0]) await client.query("DELETE FROM public.idempotency_records WHERE tenant_id=$1 AND operation=$2 AND key=$3", [tenant.tenantId, operation, idempotencyKey]);
    const unit = await client.query("SELECT 1 FROM units WHERE id=$1", [input.purchaseUnitId]);
    if (!unit.rowCount) throw new AppError("Measurement unit not found.", 422, "INVALID_UNIT");
    await client.query(`INSERT INTO public.idempotency_records (tenant_id, operation, key, request_hash, expires_at) VALUES ($1,$2,$3,$4,now()+interval '24 hours')`, [tenant.tenantId, operation, idempotencyKey, requestHash]);
    const inserted = await client.query<{ id: string }>("INSERT INTO ingredients (name, purchase_unit_id) VALUES ($1,$2) RETURNING id", [input.name, input.purchaseUnitId]);
    const row = await client.query<IngredientRow>(`${selectIngredient} WHERE i.id=$1`, [inserted.rows[0].id]);
    const ingredient = dto(row.rows[0]);
    await client.query("UPDATE public.idempotency_records SET response_status=201, response_body=$4 WHERE tenant_id=$1 AND operation=$2 AND key=$3", [tenant.tenantId, operation, idempotencyKey, JSON.stringify(ingredient)]);
    return { ingredient, replayed: false, status: 201 };
  });
}

export async function listIngredients(tenant: TenantContext, options: { limit: number; offset: number; search?: string }): Promise<{ items: Ingredient[]; total: number }> {
  return withTenantClient(tenant, async (client) => {
    const pattern = options.search ? `%${options.search}%` : null;
    const [rows, count] = await Promise.all([
      client.query<IngredientRow>(`${selectIngredient} WHERE i.archived_at IS NULL AND ($3::text IS NULL OR i.name ILIKE $3) ORDER BY i.name LIMIT $1 OFFSET $2`, [options.limit, options.offset, pattern]),
      client.query<{ total: string }>("SELECT count(*)::text total FROM ingredients WHERE archived_at IS NULL AND ($1::text IS NULL OR name ILIKE $1)", [pattern]),
    ]);
    return { items: rows.rows.map(dto), total: Number(count.rows[0].total) };
  });
}

export async function getIngredient(tenant: TenantContext, id: string): Promise<Ingredient> {
  return withTenantClient(tenant, async (client) => {
    const result = await client.query<IngredientRow>(`${selectIngredient} WHERE i.id=$1 AND i.archived_at IS NULL`, [id]);
    if (!result.rows[0]) throw new AppError("Ingredient not found.", 404, "NOT_FOUND");
    return dto(result.rows[0]);
  });
}

export async function updateIngredient(tenant: TenantContext, id: string, input: { name?: string; purchaseUnitId?: string }): Promise<Ingredient> {
  return withTenantClient(tenant, async (client) => {
    if (input.purchaseUnitId) {
      const unit = await client.query("SELECT 1 FROM units WHERE id=$1", [input.purchaseUnitId]);
      if (!unit.rowCount) throw new AppError("Measurement unit not found.", 422, "INVALID_UNIT");
    }
    const result = await client.query("UPDATE ingredients SET name=COALESCE($2,name), purchase_unit_id=COALESCE($3,purchase_unit_id), updated_at=now() WHERE id=$1 AND archived_at IS NULL RETURNING id", [id, input.name ?? null, input.purchaseUnitId ?? null]);
    if (!result.rowCount) throw new AppError("Ingredient not found.", 404, "NOT_FOUND");
    const row = await client.query<IngredientRow>(`${selectIngredient} WHERE i.id=$1`, [id]);
    return dto(row.rows[0]);
  });
}

export async function archiveIngredient(tenant: TenantContext, id: string): Promise<void> {
  await withTenantClient(tenant, async (client) => {
    const result = await client.query("UPDATE ingredients SET archived_at=now(), updated_at=now() WHERE id=$1 AND archived_at IS NULL", [id]);
    if (!result.rowCount) throw new AppError("Ingredient not found.", 404, "NOT_FOUND");
  });
}
