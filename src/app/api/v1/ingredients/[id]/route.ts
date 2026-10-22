import { ingredientIdSchema, patchIngredientSchema } from "@/server/features/ingredients/schemas/ingredient";
import { AppError } from "@/server/api/errors/app-error";
import { failure, success } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";
import { archiveIngredient, getIngredient, updateIngredient } from "@/server/features/ingredients/ingredient-service";

type Context = { params: Promise<{ id: string }> };
async function readId(context: Context): Promise<string> {
  const parsed = ingredientIdSchema.safeParse((await context.params).id);
  if (!parsed.success) throw new AppError("Invalid ingredient ID.", 400, "INVALID_ID");
  return parsed.data;
}

export async function GET(request: Request, context: Context): Promise<Response> {
  try { const { tenant } = await resolveTenant(request); return success(await getIngredient(tenant, await readId(context))); }
  catch (error) { return failure(error); }
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    assertSameOrigin(request);
    const { tenant } = await resolveTenant(request, ["OWNER", "ADMIN"]);
    const id = await readId(context);
    const parsed = patchIngredientSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ingredient data.", details: parsed.error.issues } }, { status: 400 });
    return success(await updateIngredient(tenant, id, parsed.data));
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  try {
    assertSameOrigin(request);
    const { tenant } = await resolveTenant(request, ["OWNER", "ADMIN"]);
    await archiveIngredient(tenant, await readId(context));
    return new Response(null, { status: 204 });
  } catch (error) { return failure(error); }
}
