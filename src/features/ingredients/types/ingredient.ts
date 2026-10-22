export type Ingredient = {
  id: string;
  name: string;
  purchaseUnitId: string;
  purchaseUnit: { id: string; name: string; abbreviation: string };
  createdAt: string;
};

export type CreateIngredientInput = {
  name: string;
  purchaseUnitId: string;
};
