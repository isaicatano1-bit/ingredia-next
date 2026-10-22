import "server-only";
import { z } from "zod";
export const recipeInputSchema = z.object({
  name:z.string().trim().min(1).max(160), description:z.string().trim().max(2000).optional(),
  yieldQuantity:z.number().positive().max(1_000_000), yieldUnitId:z.string().uuid(),
  ingredients:z.array(z.object({ingredientId:z.string().uuid(),quantity:z.number().positive().max(1_000_000),unitId:z.string().uuid(),preparationNote:z.string().trim().max(500).optional()}).strict()).min(1).max(200),
}).strict();
export const recipePatchSchema=z.object({name:z.string().trim().min(1).max(160).optional(),description:z.string().trim().max(2000).nullable().optional()}).strict().refine((v)=>Object.keys(v).length>0);
