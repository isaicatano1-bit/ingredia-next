export type SupplierIngredient = {
  id: string; supplierId: string; ingredientId: string; supplierProductCode: string | null;
  purchaseUnit: { id: string; name: string; abbreviation: string };
  quotedUnitPrice: string | null; currencyCode: string | null; minimumOrderQuantity: string | null;
  leadTimeDays: number | null; createdAt: string; updatedAt: string;
};
export type SupplierIngredientInput = {
  supplierId: string; ingredientId: string; supplierProductCode?: string;
  purchaseUnitId: string; quotedUnitPrice?: number; currencyCode?: string;
  minimumOrderQuantity?: number; leadTimeDays?: number;
};
export type SupplierIngredientUpdate = Partial<Omit<SupplierIngredientInput, "supplierId" | "ingredientId">> & {
  supplierProductCode?: string | null; quotedUnitPrice?: number | null; currencyCode?: string | null;
  minimumOrderQuantity?: number | null; leadTimeDays?: number | null;
};
