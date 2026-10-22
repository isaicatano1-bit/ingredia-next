import "server-only";
import { PrismaClient } from "@prisma/client";

const prismaGlobal = globalThis as typeof globalThis & { ingrediaPrisma?: PrismaClient };

export const prisma = prismaGlobal.ingrediaPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") prismaGlobal.ingrediaPrisma = prisma;
