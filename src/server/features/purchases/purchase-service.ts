import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { AppError } from "@/server/api/errors/app-error";
import { withTenantClient } from "@/server/database/tenant-pool";
import type { AuthorizedTenant, Role } from "@/server/auth/authorization";
import { mapPurchase } from "./purchase-mapper";
import type { PurchaseDraftUpdate, PurchaseDto, PurchaseInput, PurchaseLineInput, PurchaseStatus } from "./purchase-types";
import * as repository from "./purchase-repository";

const OPERATION = "purchases.create.v1";
const MANAGER_ROLES = new Set<Role>(["OWNER", "ADMIN"]);

function requireManager(tenant: AuthorizedTenant) {
  if (!MANAGER_ROLES.has(tenant.role)) {
    throw new AppError("You do not have permission for this operation.", 403, "FORBIDDEN");
  }
}

async function validateLines(client: PoolClient, supplierId: string, currencyCode: string, lines: PurchaseLineInput[]) {
  if (!await repository.supplierIsActive(client, supplierId)) {
    throw new AppError("Supplier not found in this tenant.", 422, "INVALID_SUPPLIER");
  }
  for (const line of lines) {
    const offer = await repository.findSupplierOffer(client, supplierId, line.ingredientId, line.unitId);
    if (!offer) {
      throw new AppError("Each purchase line must reference an active ingredient offered by this supplier in the selected purchase unit.", 422, "INVALID_PURCHASE_LINE");
    }
    if (offer.measurement_type !== offer.ingredient_measurement_type) {
      throw new AppError("Purchase unit is not compatible with the ingredient measurement type.", 422, "INCOMPATIBLE_UNIT");
    }
    if (offer.quote_currency && offer.quote_currency !== currencyCode) {
      throw new AppError("Purchase currency must match the supplier quote currency.", 422, "CURRENCY_MISMATCH");
    }
  }
}

async function loadPurchase(client: PoolClient, id: string): Promise<PurchaseDto> {
  const result = await repository.findPurchase(client, id);
  if (!result) throw new AppError("Purchase not found.", 404, "NOT_FOUND");
  return mapPurchase(result.header, result.lines);
}

export async function createPurchase(tenant: AuthorizedTenant, input: PurchaseInput, idempotencyKey: string) {
  requireManager(tenant);
  return withTenantClient(tenant, async (client) => {
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    await repository.lockIdempotencyKey(client, `${tenant.tenantId}:${OPERATION}:${idempotencyKey}`);
    const previous = await repository.findIdempotencyRecord(client, tenant.tenantId, OPERATION, idempotencyKey);
    if (previous?.expires_at > new Date()) {
      if (previous.request_hash !== hash) {
        throw new AppError("Idempotency key was already used with different purchase data.", 409, "IDEMPOTENCY_CONFLICT");
      }
      if (previous.response_body) {
        return { purchase: previous.response_body, replayed: true, status: previous.response_status ?? 201 };
      }
      throw new AppError("A request with this key is still processing.", 409, "IDEMPOTENCY_IN_PROGRESS");
    }
    if (previous) await repository.deleteIdempotencyRecord(client, tenant.tenantId, OPERATION, idempotencyKey);

    await validateLines(client, input.supplierId, input.currencyCode, input.lines);
    await repository.insertIdempotencyRecord(client, tenant.tenantId, OPERATION, idempotencyKey, hash);
    const id = await repository.insertPurchase(client, input);
    for (const line of input.lines) await repository.insertPurchaseLine(client, id, line);
    const purchase = await loadPurchase(client, id);
    await repository.saveIdempotencyResponse(client, tenant.tenantId, OPERATION, idempotencyKey, purchase);
    return { purchase, replayed: false, status: 201 };
  });
}

export async function listPurchases(tenant: AuthorizedTenant, options: { limit: number; offset: number; status?: PurchaseStatus }) {
  return withTenantClient(tenant, async (client) => {
    const page = await repository.listPurchaseIds(client, options.limit, options.offset, options.status);
    const items: PurchaseDto[] = [];
    for (const id of page.ids) items.push(await loadPurchase(client, id));
    return { items, total: page.total };
  });
}

export async function getPurchase(tenant: AuthorizedTenant, id: string) {
  return withTenantClient(tenant, (client) => loadPurchase(client, id));
}

export async function updatePurchaseDraft(tenant: AuthorizedTenant, id: string, input: PurchaseDraftUpdate) {
  requireManager(tenant);
  return withTenantClient(tenant, async (client) => {
    const current = await repository.findPurchase(client, id, true);
    if (!current) throw new AppError("Purchase not found.", 404, "NOT_FOUND");
    if (current.header.status !== "DRAFT") throw new AppError("Only draft purchases can be edited.", 409, "PURCHASE_FINALIZED");
    if (input.currencyCode && input.currencyCode !== current.header.currency_code && !input.lines) {
      throw new AppError("Replace the draft lines when changing its currency.", 422, "CURRENCY_REQUIRES_LINES");
    }
    if (input.lines) await validateLines(client, current.header.supplier_id, input.currencyCode ?? current.header.currency_code, input.lines);
    await repository.updatePurchaseHeader(client, id, input);
    if (input.lines) {
      await repository.deletePurchaseLines(client, id);
      for (const line of input.lines) await repository.insertPurchaseLine(client, id, line);
    }
    return loadPurchase(client, id);
  });
}

export async function confirmPurchase(tenant: AuthorizedTenant, id: string) {
  requireManager(tenant);
  return withTenantClient(tenant, async (client) => {
    const current = await repository.findPurchase(client, id, true);
    if (!current) throw new AppError("Purchase not found.", 404, "NOT_FOUND");
    if (current.header.status !== "DRAFT") throw new AppError("Only draft purchases can be confirmed.", 409, "PURCHASE_FINALIZED");
    if (current.lines.length === 0) throw new AppError("A purchase needs at least one line before confirmation.", 422, "EMPTY_PURCHASE");
    await repository.setPurchaseConfirmed(client, id);
    return loadPurchase(client, id);
  });
}

export async function deletePurchaseDraft(tenant: AuthorizedTenant, id: string) {
  requireManager(tenant);
  await withTenantClient(tenant, async (client) => {
    const current = await repository.findPurchase(client, id, true);
    if (!current) throw new AppError("Purchase not found.", 404, "NOT_FOUND");
    if (current.header.status !== "DRAFT") throw new AppError("Only draft purchases can be deleted.", 409, "PURCHASE_FINALIZED");
    await repository.deletePurchaseLines(client, id);
    await repository.deletePurchase(client, id);
  });
}
