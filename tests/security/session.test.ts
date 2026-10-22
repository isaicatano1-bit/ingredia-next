import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { jwtVerify } from "jose";

const fakePrisma = vi.hoisted(() => ({
  revokedSession: {
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}));
vi.mock("@/server/database/prisma", () => ({ prisma: fakePrisma }));

describe("JWT session lifecycle", () => {
  const secret = "unit-test-signing-secret-which-is-long-enough";
  let session: typeof import("@/server/auth/session");
  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    session = await import("@/server/auth/session");
  });
  beforeEach(() => {
    fakePrisma.revokedSession.findUnique.mockReset().mockResolvedValue(null);
    fakePrisma.revokedSession.create.mockReset().mockResolvedValue({});
    fakePrisma.revokedSession.deleteMany.mockReset().mockResolvedValue({ count: 0 });
  });

  it("issues an expiring JWT with issuer, audience, subject and token ID", async () => {
    const token = await session.issueSession("7f71764b-96e9-4f76-a1a0-f5a57a30c3ef");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { issuer: "ingredia", audience: "ingredia-api" });
    expect(payload.sub).toBe("7f71764b-96e9-4f76-a1a0-f5a57a30c3ef");
    expect(payload.jti).toBeTruthy();
    expect(payload.exp).toBeGreaterThan(payload.iat ?? 0);
    expect(await session.readSession(token)).toBe(payload.sub);
  });

  it("rejects revoked sessions and persists logout revocation", async () => {
    const token = await session.issueSession("7f71764b-96e9-4f76-a1a0-f5a57a30c3ef");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    await session.revokeSession(token);
    expect(fakePrisma.revokedSession.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tokenId: payload.jti, userId: payload.sub }),
    }));
    fakePrisma.revokedSession.findUnique.mockResolvedValue({ tokenId: payload.jti });
    await expect(session.readSession(token)).rejects.toMatchObject({ status: 401, code: "AUTH_REQUIRED" });
  });

  it("sets HttpOnly, SameSite and matching clearing attributes", () => {
    const setCookie = session.sessionCookie("signed-value", true);
    const clearCookie = session.clearedSessionCookie(true);
    for (const attribute of ["Path=/", "HttpOnly", "SameSite=Lax", "Secure"]) {
      expect(setCookie).toContain(attribute);
      expect(clearCookie).toContain(attribute);
    }
    expect(clearCookie).toContain("Max-Age=0");
  });
});
