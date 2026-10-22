import "server-only";
import type { RecipeDto } from "./recipe-types";

export type RecipeHeaderRow = {
  id: string; name: string; description: string | null; yield_quantity: string;
  yield_unit_id: string; yield_unit_name: string; yield_unit_abbreviation: string; created_at: Date;
};
export type RecipeIngredientRow = {
  id: string; ingredient_id: string; ingredient_name: string; quantity: string;
  unit_id: string; unit_name: string; unit_abbreviation: string; preparation_note: string | null;
};

export function mapRecipe(header: RecipeHeaderRow, ingredients: RecipeIngredientRow[]): RecipeDto {
  return {
    id: header.id,
    name: header.name,
    description: header.description,
    yieldQuantity: Number(header.yield_quantity),
    yieldUnit: { id: header.yield_unit_id, name: header.yield_unit_name, abbreviation: header.yield_unit_abbreviation },
    ingredients: ingredients.map((item) => ({
      id: item.id,
      ingredientId: item.ingredient_id,
      ingredientName: item.ingredient_name,
      quantity: Number(item.quantity),
      unit: { id: item.unit_id, name: item.unit_name, abbreviation: item.unit_abbreviation },
      preparationNote: item.preparation_note,
    })),
    createdAt: header.created_at.toISOString(),
  };
}
