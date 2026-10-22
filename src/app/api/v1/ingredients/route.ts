import { createIngredientSchema } from "@/features/ingredients/schemas/ingredient";
import { failure } from "@/server/api/responses/json";

// Authentication and membership lookup must supply tenant context before enabling writes.
export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    const parsed = createIngredientSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid ingredient input.", details: parsed.error.flatten() } },
        { status: 400 },
      );
    }

    // No client-supplied tenant ID or schema name is accepted. This route stays unavailable
    // until the authenticated membership resolver is wired into the application.
    return Response.json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required." } }, { status: 401 });
  } catch (error) {
    return failure(error);
  }
}
