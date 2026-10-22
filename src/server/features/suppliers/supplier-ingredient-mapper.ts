import "server-only";
import type { SupplierIngredientDto } from "./supplier-ingredient-types";

export type SupplierIngredientRow = {
  id: string;
  supplier_id: string;
  ingredient_id: string;
  supplier_product_code: string | null;
  purchase_unit_id: string;
  unit_name: string;
  unit_abbreviation: string;
  last_known_unit_price: string | null;
  currency_code: string | null;
  minimum_order_quantity: string | null;
  lead_time_days: number | null;
  created_at: Date;
  updated_at: Date;
};

export function mapSupplierIngredient(row: SupplierIngredientRow): SupplierIngredientDto {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    ingredientId: row.ingredient_id,
    supplierProductCode: row.supplier_product_code,
    purchaseUnit: { id: row.purchase_unit_id, name: row.unit_name, abbreviation: row.unit_abbreviation },
    quotedUnitPrice: row.last_known_unit_price,
    currencyCode: row.currency_code,
    minimumOrderQuantity: row.minimum_order_quantity,
    leadTimeDays: row.lead_time_days,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
