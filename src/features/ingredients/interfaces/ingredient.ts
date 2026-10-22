export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  createdAt: string;
};

export type CreateIngredientInput = {
  name: string;
  unit: string;
};
