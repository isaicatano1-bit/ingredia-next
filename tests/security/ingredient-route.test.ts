import { describe, expect, it } from "vitest";
import { POST } from "../../src/app/api/v1/ingredients/route";

describe("POST /api/v1/ingredients", () => {
  it("rejects unauthenticated writes before database access", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/ingredients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Rice", unit: "kg" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "AUTH_REQUIRED" } });
  });

  it("validates the payload before returning the auth response", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/ingredients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "", unit: "kg" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });
});
