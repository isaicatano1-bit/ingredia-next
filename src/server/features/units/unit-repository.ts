import "server-only";
import { AppError } from "@/server/api/errors/app-error";
import { withTenantClient } from "@/server/database/tenant-pool";
import type { TenantContext } from "@/server/tenancy/tenant-context";

export type MeasurementType = "MASS" | "VOLUME" | "COUNT" | "OTHER";
export type Unit = { id: string; name: string; abbreviation: string; measurementType: MeasurementType; createdAt: string };
type UnitRow = { id: string; name: string; abbreviation: string; measurement_type: MeasurementType; created_at: Date };
const columns = "id,name,abbreviation,measurement_type,created_at";
function toUnit(row: UnitRow): Unit {
  return { id: row.id, name: row.name, abbreviation: row.abbreviation, measurementType: row.measurement_type, createdAt: row.created_at.toISOString() };
}

export async function listUnits(tenant: TenantContext, limit: number, offset: number, type?: MeasurementType): Promise<{ items: Unit[]; total: number }> {
  return withTenantClient(tenant, async (client) => {
    const [rows, count] = await Promise.all([
      client.query<UnitRow>(`SELECT ${columns} FROM units WHERE ($3::text IS NULL OR measurement_type=$3) ORDER BY measurement_type,name LIMIT $1 OFFSET $2`, [limit, offset, type ?? null]),
      client.query<{ total: string }>("SELECT count(*)::text total FROM units WHERE ($1::text IS NULL OR measurement_type=$1)", [type ?? null]),
    ]);
    return { items: rows.rows.map(toUnit), total: Number(count.rows[0].total) };
  });
}

export async function createUnit(tenant: TenantContext, input: { name: string; abbreviation: string; measurementType: MeasurementType }): Promise<Unit> {
  return withTenantClient(tenant, async (client) => {
    const result = await client.query<UnitRow>(`INSERT INTO units(name,abbreviation,measurement_type) VALUES($1,$2,$3) RETURNING ${columns}`, [input.name, input.abbreviation, input.measurementType]);
    return toUnit(result.rows[0]);
  });
}

export async function getUnit(tenant: TenantContext, id: string): Promise<Unit> {
  return withTenantClient(tenant, async (client) => {
    const result = await client.query<UnitRow>(`SELECT ${columns} FROM units WHERE id=$1`, [id]);
    if (!result.rows[0]) throw new AppError("Unit not found.", 404, "NOT_FOUND");
    return toUnit(result.rows[0]);
  });
}

export async function updateUnit(tenant: TenantContext, id: string, input: { name?: string; abbreviation?: string }): Promise<Unit> {
  return withTenantClient(tenant, async (client) => {
    const result = await client.query<UnitRow>(
      `UPDATE units SET name=COALESCE($2,name),abbreviation=COALESCE($3,abbreviation) WHERE id=$1 RETURNING ${columns}`,
      [id, input.name ?? null, input.abbreviation ?? null]);
    if (!result.rows[0]) throw new AppError("Unit not found.", 404, "NOT_FOUND");
    return toUnit(result.rows[0]);
  });
}

export async function deleteUnit(tenant: TenantContext, id: string): Promise<void> {
  await withTenantClient(tenant, async (client) => {
    const result = await client.query("DELETE FROM units WHERE id=$1", [id]);
    if (!result.rowCount) throw new AppError("Unit not found.", 404, "NOT_FOUND");
  });
}
