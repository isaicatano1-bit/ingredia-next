import "server-only";
import type { PoolClient } from "pg";
import type { SupplierIngredientInput } from "./supplier-ingredient-types";
import type { SupplierIngredientRow } from "./supplier-ingredient-mapper";

const SELECT_FIELDS = `si.id,si.supplier_id,si.ingredient_id,si.supplier_product_code,
  si.purchase_unit_id,u.name AS unit_name,u.abbreviation AS unit_abbreviation,
  si.last_known_unit_price::text,si.currency_code,si.minimum_order_quantity::text,
  si.lead_time_days,si.created_at,si.updated_at`;
const SELECT_FROM = `FROM supplier_ingredients si JOIN units u ON u.id=si.purchase_unit_id`;

export async function findSupplierIngredientReferences(client: PoolClient, supplierId: string, ingredientId: string, unitId: string) {
  return client.query<{ supplier_id: string; measurement_type: string; ingredient_measurement_type: string }>(
    `SELECT s.id AS supplier_id,u.measurement_type,i_u.measurement_type AS ingredient_measurement_type
     FROM suppliers s CROSS JOIN ingredients i JOIN units u ON u.id=$3
     JOIN units i_u ON i_u.id=i.purchase_unit_id
     WHERE s.id=$1 AND s.archived_at IS NULL AND i.id=$2 AND i.archived_at IS NULL`,
    [supplierId, ingredientId, unitId],
  );
}

export async function listSupplierIngredients(client: PoolClient, options: { limit: number; offset: number; supplierId?: string; ingredientId?: string }) {
  const values = [options.supplierId ?? null, options.ingredientId ?? null, options.limit, options.offset];
  const [rows, count] = await Promise.all([
    client.query<SupplierIngredientRow>(
      `SELECT ${SELECT_FIELDS} ${SELECT_FROM}
       WHERE ($1::uuid IS NULL OR si.supplier_id=$1) AND ($2::uuid IS NULL OR si.ingredient_id=$2)
       ORDER BY si.created_at DESC LIMIT $3 OFFSET $4`, values,
    ),
    client.query<{ total: string }>(
      `SELECT count(*)::text AS total FROM supplier_ingredients si
       WHERE ($1::uuid IS NULL OR si.supplier_id=$1) AND ($2::uuid IS NULL OR si.ingredient_id=$2)`, values.slice(0, 2),
    ),
  ]);
  return { rows: rows.rows, total: Number(count.rows[0].total) };
}

export async function findSupplierIngredient(client: PoolClient, id: string, lockForUpdate = false) {
  const result = await client.query<SupplierIngredientRow>(
    `SELECT ${SELECT_FIELDS} ${SELECT_FROM} WHERE si.id=$1${lockForUpdate ? " FOR UPDATE OF si" : ""}`, [id],
  );
  return result.rows[0] ?? null;
}

export async function insertSupplierIngredient(client: PoolClient, input: Required<Pick<SupplierIngredientInput, "supplierId" | "ingredientId" | "purchaseUnitId">> & SupplierIngredientInput) {
  const result = await client.query<{ id: string }>(
    `INSERT INTO supplier_ingredients
      (supplier_id,ingredient_id,supplier_product_code,purchase_unit_id,last_known_unit_price,currency_code,minimum_order_quantity,lead_time_days)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [input.supplierId,input.ingredientId,input.supplierProductCode??null,input.purchaseUnitId,input.quotedUnitPrice??null,input.currencyCode??null,input.minimumOrderQuantity??null,input.leadTimeDays??null],
  );
  return result.rows[0].id;
}

export async function updateSupplierIngredient(client: PoolClient,id: string,input: SupplierIngredientInput & { purchaseUnitId: string }) {
  await client.query(
    `UPDATE supplier_ingredients
     SET supplier_product_code=CASE WHEN $2 THEN $3 ELSE supplier_product_code END,
         purchase_unit_id=$4,
         last_known_unit_price=CASE WHEN $5 THEN $6 ELSE last_known_unit_price END,
         currency_code=CASE WHEN $5 THEN $7 ELSE currency_code END,
         minimum_order_quantity=CASE WHEN $8 THEN $9 ELSE minimum_order_quantity END,
         lead_time_days=CASE WHEN $10 THEN $11 ELSE lead_time_days END, updated_at=now()
     WHERE id=$1`,
    [id,Object.hasOwn(input,"supplierProductCode"),input.supplierProductCode??null,input.purchaseUnitId,
      Object.hasOwn(input,"quotedUnitPrice"),input.quotedUnitPrice??null,input.currencyCode??null,
      Object.hasOwn(input,"minimumOrderQuantity"),input.minimumOrderQuantity??null,
      Object.hasOwn(input,"leadTimeDays"),input.leadTimeDays??null],
  );
}

export async function deleteSupplierIngredient(client: PoolClient,id: string) {
  const result = await client.query("DELETE FROM supplier_ingredients WHERE id=$1 RETURNING id", [id]);
  return Boolean(result.rowCount);
}
