import { describe, expect, it } from "vitest";
import { createUnitSchema, patchUnitSchema } from "@/server/features/units/schemas/unit";

describe("unit request schemas", () => {
  it("normalizes abbreviations and validates supported measurement types", () => {
    expect(createUnitSchema.parse({ name: "Kilogram", abbreviation: " KG ", measurementType: "MASS" })).toEqual({
      name: "Kilogram", abbreviation: "kg", measurementType: "MASS",
    });
  });

  it("rejects unknown fields and prevents changing a unit's measurement type", () => {
    expect(createUnitSchema.safeParse({ name: "Kilogram", abbreviation: "kg", measurementType: "MASS", tenantId: "forged" }).success).toBe(false);
    expect(patchUnitSchema.safeParse({ measurementType: "VOLUME" }).success).toBe(false);
  });
});
