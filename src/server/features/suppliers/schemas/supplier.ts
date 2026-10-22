import "server-only";
import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1).max(160),
  contactName: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().max(40).optional(),
}).strict();
export const patchSupplierSchema = createSupplierSchema.partial().refine((value) => Object.keys(value).length > 0);
