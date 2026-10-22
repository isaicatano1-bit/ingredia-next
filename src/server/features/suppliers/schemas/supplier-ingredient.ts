import "server-only";
import { z } from "zod";

const positiveMoney = z.number().finite().positive().max(9_999_999_999.9999);
const positiveQuantity = z.number().finite().positive().max(9_999_999_999.9999);

const supplierIngredientFields = z.object({
  supplierId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  supplierProductCode: z.string().trim().min(1).max(120).optional(),
  purchaseUnitId: z.string().uuid(),
  quotedUnitPrice: positiveMoney.optional(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/).optional(),
  minimumOrderQuantity: positiveQuantity.optional(),
  leadTimeDays: z.number().int().min(0).max(3650).optional(),
}).strict();

export const createSupplierIngredientSchema = supplierIngredientFields.refine((v) => (v.quotedUnitPrice === undefined) === (v.currencyCode === undefined), {
  message: "Currency is required when a quoted price is provided.", path: ["currencyCode"],
});

export const patchSupplierIngredientSchema = z.object({
  supplierProductCode:z.string().trim().min(1).max(120).nullable().optional(),
  purchaseUnitId:z.string().uuid().optional(),
  quotedUnitPrice:positiveMoney.nullable().optional(),
  currencyCode:z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  minimumOrderQuantity:positiveQuantity.nullable().optional(),
  leadTimeDays:z.number().int().min(0).max(3650).nullable().optional(),
}).strict().refine((v) => Object.keys(v).length > 0)
  .refine((v) => Object.hasOwn(v,"quotedUnitPrice") === Object.hasOwn(v,"currencyCode"), {
    message: "Update quoted price and currency together.", path: ["currencyCode"],
  });

export const supplierIngredientIdSchema = z.string().uuid();
