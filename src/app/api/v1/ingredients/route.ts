import { z } from "zod";
import { createIngredientSchema } from "@/server/features/ingredients/schemas/ingredient";
import { failure } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";
import { createIngredient, listIngredients } from "@/server/features/ingredients/ingredient-service";
import { enforceRateLimit } from "@/server/security/rate-limit";

const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), search: z.string().trim().max(120).optional() });

export async function GET(request: Request): Promise<Response> {
  try {
    const { tenant } = await resolveTenant(request);
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid pagination or search parameters." } }, { status: 400 });
    const { page, limit, search } = parsed.data;
    const result = await listIngredients(tenant, { limit, offset: (page - 1) * limit, search });
    return Response.json({ data: result.items, meta: { page, limit, total: result.total } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const { user, tenant } = await resolveTenant(request, ["OWNER", "ADMIN"]);
    await enforceRateLimit("ingredients.create", `${tenant.tenantId}:${user.id}`, 30, 60);
    const key = request.headers.get("idempotency-key")?.trim();
    if (!key || key.length > 200) return Response.json({ error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: "A valid Idempotency-Key header is required." } }, { status: 400 });
    const parsed = createIngredientSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ingredient data.", details: parsed.error.issues } }, { status: 400 });
    const result = await createIngredient(tenant, parsed.data, key);
    return Response.json({ data: result.ingredient }, { status: result.status, headers: result.replayed ? { "Idempotency-Replayed": "true" } : {} });
  } catch (error) { return failure(error); }
}
