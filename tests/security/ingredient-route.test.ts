import { describe, expect, it } from "vitest";
import { POST } from "../../src/app/api/v1/ingredients/route";

describe("POST /api/v1/ingredients", () => {
  it("rejects unauthenticated writes before database access", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/ingredients", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost" },
        body: JSON.stringify({ name: "Rice", purchaseUnitId: "7f71764b-96e9-4f76-a1a0-f5a57a30c3ef" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "AUTH_REQUIRED" } });
  });

  it("requires authentication before accessing tenant resources", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/ingredients", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost" },
        body: JSON.stringify({ name: "", purchaseUnitId: "not-a-uuid" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "AUTH_REQUIRED" } });
  });
});
