import "server-only";
export type SupplierIngredientDto = {
  id: string;
  supplierId: string;
  ingredientId: string;
  supplierProductCode: string | null;
  purchaseUnit: { id: string; name: string; abbreviation: string };
  quotedUnitPrice: string | null;
  currencyCode: string | null;
  minimumOrderQuantity: string | null;
  leadTimeDays: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierIngredientInput = {
  supplierId?: string;
  ingredientId?: string;
  supplierProductCode?: string | null;
  purchaseUnitId?: string;
  quotedUnitPrice?: number | null;
  currencyCode?: string | null;
  minimumOrderQuantity?: number | null;
  leadTimeDays?: number | null;
};
