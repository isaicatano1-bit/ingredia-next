import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  RATE_LIMIT_REDIS_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
