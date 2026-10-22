import { z } from "zod";

export const createIngredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(24),
});
