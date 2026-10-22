export type RecipeInput = {
  name: string; description?: string; yieldQuantity: number; yieldUnitId: string;
  ingredients: Array<{ ingredientId: string; quantity: number; unitId: string; preparationNote?: string }>;
};
export type Recipe = {
  id: string; name: string; description: string | null; yieldQuantity: number;
  yieldUnit: { id: string; name: string; abbreviation: string };
  ingredients: Array<{ id: string; ingredientId: string; ingredientName: string; quantity: number; unit: { id: string; name: string; abbreviation: string }; preparationNote: string | null }>;
  createdAt: string;
};
