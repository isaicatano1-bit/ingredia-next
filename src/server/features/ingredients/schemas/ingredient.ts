import "server-only";
import { z } from "zod";

export const createIngredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  purchaseUnitId: z.string().uuid(),
}).strict();

export const patchIngredientSchema = createIngredientSchema.partial().refine((value) => Object.keys(value).length > 0);
export const ingredientIdSchema = z.string().uuid();
