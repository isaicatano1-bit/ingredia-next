import "server-only";
import { prisma } from "@/server/database/prisma";
import { AppError } from "@/server/api/errors/app-error";
import { hashPassword, verifyPassword } from "@/server/security/password";
import type { Credentials } from "@/features/auth/auth.schemas";

export async function register(credentials: Credentials) {
  const passwordHash = await hashPassword(credentials.password);
  try {
    return await prisma.user.create({
      data: { email: credentials.email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new AppError("An account with this email already exists.", 409, "ACCOUNT_EXISTS");
    }
    throw error;
  }
}

export async function authenticateCredentials(credentials: Credentials) {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
    select: { id: true, email: true, passwordHash: true, createdAt: true },
  });
  // Use a fixed dummy hash path to keep the response shape generic for unknown emails.
  const valid = user ? await verifyPassword(credentials.password, user.passwordHash) : await hashPassword(credentials.password).then(() => false);
  if (!user || !valid) throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}
