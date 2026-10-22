import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { env } from "@/server/config/env";
import { AppError } from "@/server/api/errors/app-error";

export const SESSION_COOKIE = env.NODE_ENV === "production" ? "__Host-ingredia_session" : "ingredia_session";
export const SESSION_SECONDS = 60 * 60;
const issuer = "ingredia";
const audience = "ingredia-api";

function key(): Uint8Array {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
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
  try {
    const { payload } = await jwtVerify(token, key(), { issuer, audience, algorithms: ["HS256"] });
    if (!payload.sub) throw new Error("Missing subject");
    return payload.sub;
  } catch {
    throw new AppError("Authentication is required.", 401, "AUTH_REQUIRED");
  }
}

export function sessionCookie(token: string, production = env.NODE_ENV === "production"): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${production ? "; Secure" : ""}`;
}

export function clearedSessionCookie(production = env.NODE_ENV === "production"): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${production ? "; Secure" : ""}`;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const expectedOrigin = env.APP_BASE_URL ? new URL(env.APP_BASE_URL).origin : new URL(request.url).origin;
  if (!origin || origin !== expectedOrigin) {
    throw new AppError("Request origin is not allowed.", 403, "CSRF_REJECTED");
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
