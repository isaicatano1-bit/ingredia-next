import "server-only";
import type { PoolClient } from "pg";
import type { PurchaseDraftUpdate, PurchaseInput, PurchaseLineInput, PurchaseStatus } from "./purchase-types";
import type { PurchaseHeaderRow, PurchaseLineRow } from "./purchase-mapper";
import type { PurchaseDto } from "./purchase-types";

const HEADER_FIELDS = `p.id,p.supplier_id,s.name AS supplier_name,p.purchase_date,p.invoice_number,
  p.status,p.currency_code,p.notes,p.created_at,p.updated_at,p.finalized_at`;
const HEADER_FROM = "FROM purchases p JOIN suppliers s ON s.id=p.supplier_id";

export async function lockIdempotencyKey(client: PoolClient, scope: string) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [scope]);
}

export async function findIdempotencyRecord(client: PoolClient, tenantId: string, operation: string, key: string) {
  const result = await client.query<{ request_hash: string; response_status: number | null; response_body: PurchaseDto | null; expires_at: Date }>(
    `SELECT request_hash,response_status,response_body,expires_at FROM public.idempotency_records
     WHERE tenant_id=$1 AND operation=$2 AND key=$3 FOR UPDATE`, [tenantId, operation, key],
  );
  return result.rows[0] ?? null;
}

export async function deleteIdempotencyRecord(client: PoolClient, tenantId: string, operation: string, key: string) {
  await client.query("DELETE FROM public.idempotency_records WHERE tenant_id=$1 AND operation=$2 AND key=$3", [tenantId, operation, key]);
}

export async function insertIdempotencyRecord(client: PoolClient, tenantId: string, operation: string, key: string, requestHash: string) {
  await client.query(
    `INSERT INTO public.idempotency_records(tenant_id,operation,key,request_hash,expires_at)
     VALUES($1,$2,$3,$4,now()+interval '24 hours')`, [tenantId, operation, key, requestHash],
  );
}

export async function saveIdempotencyResponse(client: PoolClient, tenantId: string, operation: string, key: string, body: unknown) {
  await client.query(
    `UPDATE public.idempotency_records SET response_status=201,response_body=$4
     WHERE tenant_id=$1 AND operation=$2 AND key=$3`, [tenantId, operation, key, JSON.stringify(body)],
  );
}

export async function supplierIsActive(client: PoolClient, supplierId: string) {
  const result = await client.query("SELECT 1 FROM suppliers WHERE id=$1 AND archived_at IS NULL", [supplierId]);
  return Boolean(result.rowCount);
}

export async function findSupplierOffer(client: PoolClient, supplierId: string, ingredientId: string, unitId: string) {
  const result = await client.query<{ measurement_type: string; ingredient_measurement_type: string; quote_currency: string | null }>(
    `SELECT u.measurement_type,iu.measurement_type AS ingredient_measurement_type,si.currency_code AS quote_currency
     FROM supplier_ingredients si JOIN ingredients i ON i.id=si.ingredient_id
     JOIN units u ON u.id=si.purchase_unit_id JOIN units iu ON iu.id=i.purchase_unit_id
     WHERE si.supplier_id=$1 AND si.ingredient_id=$2 AND si.purchase_unit_id=$3
       AND i.archived_at IS NULL`, [supplierId, ingredientId, unitId],
  );
  return result.rows[0] ?? null;
}

export async function insertPurchase(client: PoolClient, input: PurchaseInput) {
  const result = await client.query<{ id: string }>(
    `INSERT INTO purchases(supplier_id,purchase_date,invoice_number,currency_code,notes)
     VALUES($1,$2,$3,$4,$5) RETURNING id`,
    [input.supplierId,input.purchaseDate,input.invoiceNumber??null,input.currencyCode,input.notes??null],
  );
  return result.rows[0].id;
}

export async function insertPurchaseLine(client: PoolClient, purchaseId: string, line: PurchaseLineInput) {
  await client.query(
    `INSERT INTO purchase_lines(purchase_id,ingredient_id,quantity,unit_id,unit_price)
     VALUES($1,$2,$3,$4,$5)`, [purchaseId,line.ingredientId,line.quantity,line.unitId,line.unitPrice],
  );
}

export async function findPurchase(client: PoolClient, id: string, lockForUpdate = false) {
  const header = await client.query<PurchaseHeaderRow>(
    `SELECT ${HEADER_FIELDS} ${HEADER_FROM} WHERE p.id=$1${lockForUpdate ? " FOR UPDATE OF p" : ""}`, [id],
  );
  if (!header.rows[0]) return null;
  const lines = await client.query<PurchaseLineRow>(
    `SELECT pl.id,pl.ingredient_id,i.name AS ingredient_name,pl.quantity::text,
       pl.unit_id,u.name AS unit_name,u.abbreviation AS unit_abbreviation,
       pl.unit_price::text,pl.line_total::text
     FROM purchase_lines pl JOIN ingredients i ON i.id=pl.ingredient_id JOIN units u ON u.id=pl.unit_id
     WHERE pl.purchase_id=$1 ORDER BY pl.created_at,pl.id`, [id],
  );
  return { header: header.rows[0], lines: lines.rows };
}

export async function listPurchaseIds(client: PoolClient, limit: number, offset: number, status?: PurchaseStatus) {
  const [ids, count] = await Promise.all([
    client.query<{ id: string }>(
      "SELECT id FROM purchases WHERE ($1::text IS NULL OR status=$1) ORDER BY purchase_date DESC,id LIMIT $2 OFFSET $3",
      [status ?? null, limit, offset],
    ),
    client.query<{ total: string }>("SELECT count(*)::text AS total FROM purchases WHERE ($1::text IS NULL OR status=$1)", [status ?? null]),
  ]);
  return { ids: ids.rows.map((row) => row.id), total: Number(count.rows[0].total) };
}

export async function updatePurchaseHeader(client: PoolClient, id: string, input: PurchaseDraftUpdate) {
  await client.query(
    `UPDATE purchases SET purchase_date=COALESCE($2,purchase_date),
      invoice_number=CASE WHEN $3 THEN $4 ELSE invoice_number END,
      currency_code=COALESCE($5,currency_code),
      notes=CASE WHEN $6 THEN $7 ELSE notes END
     WHERE id=$1`,
    [id,input.purchaseDate??null,Object.hasOwn(input,"invoiceNumber"),input.invoiceNumber??null,
      input.currencyCode??null,Object.hasOwn(input,"notes"),input.notes??null],
  );
}

export async function deletePurchaseLines(client: PoolClient, id: string) {
  await client.query("DELETE FROM purchase_lines WHERE purchase_id=$1", [id]);
}

export async function countPurchaseLines(client: PoolClient, id: string) {
  const result = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM purchase_lines WHERE purchase_id=$1", [id]);
  return Number(result.rows[0].count);
}

export async function setPurchaseConfirmed(client: PoolClient, id: string) {
  await client.query("UPDATE purchases SET status='CONFIRMED' WHERE id=$1", [id]);
}

export async function deletePurchase(client: PoolClient, id: string) {
  await client.query("DELETE FROM purchases WHERE id=$1", [id]);
}
