import "server-only";
import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128).refine((value) => new TextEncoder().encode(value).byteLength <= 72, "Password must be at most 72 UTF-8 bytes."),
}).strict();

export type Credentials = z.infer<typeof credentialsSchema>;
