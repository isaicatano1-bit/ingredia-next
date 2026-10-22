import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/security/password";

describe("password hashing", () => {
  it("stores a salted hash and verifies only the original password", async () => {
    const encoded = await hashPassword("correct horse battery staple");
    expect(encoded).toMatch(/^\$2[aby]\$/);
    expect(encoded).not.toContain("correct horse");
    await expect(verifyPassword("correct horse battery staple", encoded)).resolves.toBe(true);
    await expect(verifyPassword("incorrect password", encoded)).resolves.toBe(false);
  });
});
