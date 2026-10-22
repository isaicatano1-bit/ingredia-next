import "server-only";
import { z } from "zod";

export const measurementTypes = ["MASS", "VOLUME", "COUNT", "OTHER"] as const;
export const createUnitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  abbreviation: z.string().trim().min(1).max(20).transform((value) => value.toLowerCase()),
  measurementType: z.enum(measurementTypes),
}).strict();
export const patchUnitSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  abbreviation: z.string().trim().min(1).max(20).transform((value) => value.toLowerCase()).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);
export const unitIdSchema = z.string().uuid();
