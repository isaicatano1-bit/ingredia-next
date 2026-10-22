import { describe, expect, it } from "vitest";
import { createSupplierIngredientSchema, patchSupplierIngredientSchema } from "@/server/features/suppliers/schemas/supplier-ingredient";
import { purchaseDraftSchema, purchasePatchSchema } from "@/server/features/purchases/schemas/purchase";

const ids={supplierId:"11111111-1111-4111-8111-111111111111",ingredientId:"22222222-2222-4222-8222-222222222222",unitId:"33333333-3333-4333-8333-333333333333"};
describe("supplier relationship and purchasing validation",()=>{
 it("requires quote currency with a positive supplier quote",()=>{
  const relationship={supplierId:ids.supplierId,ingredientId:ids.ingredientId,purchaseUnitId:ids.unitId};
  expect(createSupplierIngredientSchema.safeParse({...relationship,quotedUnitPrice:0,currencyCode:"USD"}).success).toBe(false);
  expect(createSupplierIngredientSchema.safeParse({...relationship,quotedUnitPrice:2.5}).success).toBe(false);
  expect(createSupplierIngredientSchema.safeParse({...relationship,quotedUnitPrice:2.5,currencyCode:"USD"}).success).toBe(true);
 });
 it("requires quote and currency to be updated together",()=>{
  expect(patchSupplierIngredientSchema.safeParse({quotedUnitPrice:3}).success).toBe(false);
  expect(patchSupplierIngredientSchema.safeParse({quotedUnitPrice:3,currencyCode:"USD"}).success).toBe(true);
  expect(patchSupplierIngredientSchema.safeParse({quotedUnitPrice:null,currencyCode:null}).success).toBe(true);
 });
 it("rejects non-positive purchase line quantity and price",()=>{
  const body={supplierId:ids.supplierId,purchaseDate:"2026-10-22T10:00:00Z",currencyCode:"USD",lines:[{ingredientId:ids.ingredientId,quantity:1,unitId:ids.unitId,unitPrice:2}]};
  expect(purchaseDraftSchema.safeParse(body).success).toBe(true);
  expect(purchaseDraftSchema.safeParse({...body,lines:[{...body.lines[0],quantity:0}]}).success).toBe(false);
  expect(purchaseDraftSchema.safeParse({...body,lines:[{...body.lines[0],unitPrice:-1}]}).success).toBe(false);
 });
 it("allows partial draft updates, leaving currency consistency to the transactional service",()=>{
  expect(purchasePatchSchema.safeParse({currencyCode:"USD"}).success).toBe(true);
 });
});
