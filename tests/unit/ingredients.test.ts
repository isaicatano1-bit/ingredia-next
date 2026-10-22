import { describe, expect, it } from "vitest";
import { createIngredientSchema } from "../../src/server/features/ingredients/schemas/ingredient";

describe("createIngredientSchema", () => {
  it("trims and accepts valid values", () => {
    const purchaseUnitId = "7f71764b-96e9-4f76-a1a0-f5a57a30c3ef";
    expect(createIngredientSchema.parse({ name: " Rice ", purchaseUnitId })).toEqual({
      name: "Rice",
      purchaseUnitId,
    });
  });

  it("rejects empty or oversized values", () => {
    const purchaseUnitId = "7f71764b-96e9-4f76-a1a0-f5a57a30c3ef";
    expect(createIngredientSchema.safeParse({ name: " ", purchaseUnitId }).success).toBe(false);
    expect(createIngredientSchema.safeParse({ name: "x".repeat(121), purchaseUnitId }).success).toBe(false);
  });
});
