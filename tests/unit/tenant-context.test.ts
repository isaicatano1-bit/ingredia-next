import { describe, expect, it } from "vitest";
import { assertTenantSchema, schemaForTenantId } from "../../src/server/tenancy/tenant-context";

describe("assertTenantSchema", () => {
  it("accepts generated tenant schema identifiers", () => {
    expect(assertTenantSchema(`tenant_${"a".repeat(32)}`)).toBe(`tenant_${"a".repeat(32)}`);
  });

  it.each([
    "public",
    "tenant_abc",
    `tenant_${"A".repeat(32)}`,
    `tenant_${"a".repeat(31)}`,
    `tenant_${"a".repeat(32)}; DROP SCHEMA public`,
    'tenant_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; SELECT 1; --',
  ])("rejects non-generated identifier %s", (schemaName) => {
    expect(() => assertTenantSchema(schemaName)).toThrow("Invalid tenant schema identifier");
  });
});

describe("schemaForTenantId", () => {
  it("derives a stable schema name from a valid internal UUID", () => {
    expect(schemaForTenantId("123e4567-e89b-12d3-a456-426614174000"))
      .toBe("tenant_123e4567e89b12d3a456426614174000");
    expect(schemaForTenantId("123E4567-E89B-12D3-A456-426614174000"))
      .toBe("tenant_123e4567e89b12d3a456426614174000");
  });

  it.each(["public", "../tenant_x", "123e4567-e89b-12d3-a456-42661417400z"])(
    "rejects invalid internal tenant ID %s",
    (tenantId) => expect(() => schemaForTenantId(tenantId)).toThrow("Invalid internal tenant identifier"),
  );
});
