import { describe, expect, it } from "vitest";
import { createIngredientSchema } from "../../src/features/ingredients/schemas/ingredient";

describe("createIngredientSchema", () => {
  it("trims and accepts valid values", () => {
    expect(createIngredientSchema.parse({ name: " Rice ", unit: " kg " })).toEqual({
      name: "Rice",
      unit: "kg",
    });
  });

  it("rejects empty or oversized values", () => {
    expect(createIngredientSchema.safeParse({ name: " ", unit: "kg" }).success).toBe(false);
    expect(createIngredientSchema.safeParse({ name: "x".repeat(121), unit: "kg" }).success).toBe(false);
  });
});
