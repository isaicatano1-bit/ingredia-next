import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { env } from "@/server/config/env";
import { AppError } from "@/server/api/errors/app-error";
import { prisma } from "@/server/database/prisma";

export const SESSION_COOKIE = env.NODE_ENV === "production" ? "__Host-ingredia_session" : "ingredia_session";
export const SESSION_SECONDS = 60 * 60;
const issuer = "ingredia";
const audience = "ingredia-api";

function key(): Uint8Array {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  if (env.NODE_ENV === "production") {
    if (!env.APP_BASE_URL) throw new Error("APP_BASE_URL is required in production");
    if (new URL(env.APP_BASE_URL).protocol !== "https:") throw new Error("APP_BASE_URL must use HTTPS in production");
  }
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function issueSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(key());
}

export async function readSession(token: string): Promise<string> {
  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
  const verificationKey = key();
  try {
    ({ payload } = await jwtVerify(token, verificationKey, { issuer, audience, algorithms: ["HS256"] }));
  } catch {
    throw new AppError("Authentication is required.", 401, "AUTH_REQUIRED");
  }
  if (!payload.sub || !payload.jti || !payload.exp) throw new AppError("Authentication is required.", 401, "AUTH_REQUIRED");
  const revoked = await prisma.revokedSession.findUnique({ where: { tokenId: payload.jti }, select: { tokenId: true } });
  if (revoked) throw new AppError("Authentication is required.", 401, "AUTH_REQUIRED");
  return payload.sub;
}

export function sessionCookie(token: string, production = env.NODE_ENV === "production"): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${production ? "; Secure" : ""}`;
}

export function clearedSessionCookie(production = env.NODE_ENV === "production"): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${production ? "; Secure" : ""}`;
}

export function assertSameOrigin(request: Request): void {
  if (env.NODE_ENV === "production" && !env.APP_BASE_URL) {
    throw new AppError("The application origin is not configured.", 503, "SECURITY_CONFIGURATION_ERROR");
  }
  if (env.NODE_ENV === "production" && env.APP_BASE_URL && new URL(env.APP_BASE_URL).protocol !== "https:") {
    throw new AppError("The application origin must use HTTPS.", 503, "SECURITY_CONFIGURATION_ERROR");
  }
  const origin = request.headers.get("origin");
  const expectedOrigin = env.APP_BASE_URL ? new URL(env.APP_BASE_URL).origin : new URL(request.url).origin;
  if (!origin || origin !== expectedOrigin) {
    throw new AppError("Request origin is not allowed.", 403, "CSRF_REJECTED");
  }
}

export async function revokeSession(token: string): Promise<void> {
  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
  const verificationKey = key();
  try {
    ({ payload } = await jwtVerify(token, verificationKey, { issuer, audience, algorithms: ["HS256"] }));
  } catch {
    return; // Invalid or expired cookies need only be cleared in the browser.
  }
  if (!payload.sub || !payload.jti || !payload.exp) return;
  try {
    await prisma.revokedSession.create({ data: { tokenId: payload.jti, userId: payload.sub, expiresAt: new Date(payload.exp * 1000) } });
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")) throw error;
  }
  if (Math.random() < 0.02) {
    await prisma.revokedSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}

export function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [cookieName, ...value] = part.trim().split("=");
    if (cookieName === name) return value.join("=");
  }
  return undefined;
}
