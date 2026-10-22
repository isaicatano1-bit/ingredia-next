import "server-only";
import type { Ingredient } from "@/features/ingredients/types/ingredient";

export type IngredientRow = {
  id: string; name: string; purchase_unit_id: string; unit_name: string;
  abbreviation: string; created_at: Date;
};

export function mapIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    purchaseUnitId: row.purchase_unit_id,
    purchaseUnit: { id: row.purchase_unit_id, name: row.unit_name, abbreviation: row.abbreviation },
    createdAt: row.created_at.toISOString(),
  };
}
