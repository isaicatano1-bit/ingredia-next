import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import type { AuthorizedTenant } from "@/server/auth/authorization";
import type { PurchaseDto, PurchaseInput } from "@/server/features/purchases/purchase-types";

vi.mock("@/server/database/tenant-pool", () => ({
  withTenantClient: vi.fn(async (_tenant: unknown, operation: (client: unknown) => Promise<unknown>) => operation({})),
}));
vi.mock("@/server/features/purchases/purchase-repository", () => ({
  lockIdempotencyKey: vi.fn(),
  findIdempotencyRecord: vi.fn(),
  deleteIdempotencyRecord: vi.fn(),
  insertIdempotencyRecord: vi.fn(),
  saveIdempotencyResponse: vi.fn(),
  supplierIsActive: vi.fn(),
  findSupplierOffer: vi.fn(),
  insertPurchase: vi.fn(),
  insertPurchaseLine: vi.fn(),
  findPurchase: vi.fn(),
  listPurchaseIds: vi.fn(),
  updatePurchaseHeader: vi.fn(),
  deletePurchaseLines: vi.fn(),
  countPurchaseLines: vi.fn(),
  setPurchaseConfirmed: vi.fn(),
  deletePurchase: vi.fn(),
}));

import { withTenantClient } from "@/server/database/tenant-pool";
import * as repository from "@/server/features/purchases/purchase-repository";
import { createPurchase } from "@/server/features/purchases/purchase-service";

const tenant: AuthorizedTenant = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  schemaName: "tenant_11111111111141118111111111111111",
  role: "OWNER",
  name: "Demo",
};
const member = { ...tenant, role: "MEMBER" as const };
const input: PurchaseInput = {
  supplierId: "22222222-2222-4222-8222-222222222222",
  purchaseDate: "2026-10-22T10:00:00Z",
  currencyCode: "USD",
  lines: [{ ingredientId:"33333333-3333-4333-8333-333333333333",quantity:2,unitId:"44444444-4444-4444-8444-444444444444",unitPrice:3.25 }],
};
const response: PurchaseDto = {
  id:"55555555-5555-4555-8555-555555555555",supplier:{id:input.supplierId,name:"Supplier"},
  purchaseDate:input.purchaseDate,invoiceNumber:null,status:"DRAFT",currencyCode:"USD",notes:null,
  lines:[],createdAt:input.purchaseDate,updatedAt:input.purchaseDate,finalizedAt:null,
};

describe("purchase service authorization and idempotency", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-manager writes before opening a tenant transaction", async () => {
    await expect(createPurchase(member,input,"retry-key")).rejects.toMatchObject({status:403,code:"FORBIDDEN"});
    expect(withTenantClient).not.toHaveBeenCalled();
  });

  it("replays a matching idempotent request without inserting another purchase", async () => {
    vi.mocked(repository.findIdempotencyRecord).mockResolvedValue({
      request_hash:createHash("sha256").update(JSON.stringify(input)).digest("hex"),
      response_status:201,response_body:response,expires_at:new Date(Date.now()+60_000),
    });
    const result=await createPurchase(tenant,input,"retry-key");
    expect(result).toEqual({purchase:response,replayed:true,status:201});
    expect(repository.insertPurchase).not.toHaveBeenCalled();
  });

  it("rejects reuse of an idempotency key for different data", async () => {
    vi.mocked(repository.findIdempotencyRecord).mockResolvedValue({
      request_hash:"different-hash",response_status:201,response_body:response,expires_at:new Date(Date.now()+60_000),
    });
    await expect(createPurchase(tenant,input,"retry-key")).rejects.toMatchObject({status:409,code:"IDEMPOTENCY_CONFLICT"});
    expect(repository.insertPurchase).not.toHaveBeenCalled();
  });
});
