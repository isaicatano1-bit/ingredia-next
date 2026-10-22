import "server-only";
import { z } from "zod";

const lineSchema = z.object({
  ingredientId: z.string().uuid(),
  quantity: z.number().finite().positive().max(9_999_999_999.9999),
  unitId: z.string().uuid(),
  unitPrice: z.number().finite().positive().max(9_999_999_999.9999),
}).strict().refine((line) => line.quantity * line.unitPrice <= 99_999_999_999_999.9999, {
  message: "Quantity multiplied by unit price exceeds the supported line total.", path: ["unitPrice"],
});

export const purchaseDraftSchema = z.object({
  supplierId: z.string().uuid(),
  purchaseDate: z.string().datetime({ offset: true }),
  invoiceNumber: z.string().trim().min(1).max(160).optional(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  notes: z.string().trim().max(4000).optional(),
  lines: z.array(lineSchema).min(1).max(200),
}).strict();

export const purchasePatchSchema = z.object({
  purchaseDate: z.string().datetime({ offset: true }).optional(),
  invoiceNumber: z.string().trim().min(1).max(160).nullable().optional(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  lines: z.array(lineSchema).min(1).max(200).optional(),
}).strict().refine((v) => Object.keys(v).length > 0);

export const purchaseIdSchema = z.string().uuid();
