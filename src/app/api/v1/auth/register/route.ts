import { credentialsSchema } from "@/server/auth/schemas/auth";
import { failure } from "@/server/api/responses/json";
import { register } from "@/server/auth/auth-service";
import { issueSession, sessionCookie } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { assertSameOrigin } from "@/server/auth/session";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const body: unknown = await request.json();
    const parsed = credentialsSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid registration data.", details: parsed.error.issues } }, { status: 400 });
    await enforceRateLimit("register", parsed.data.email, 5, 3600);
    const user = await register(parsed.data);
    const token = await issueSession(user.id);
    return Response.json({ data: { user } }, { status: 201, headers: { "Set-Cookie": sessionCookie(token) } });
  } catch (error) { return failure(error); }
}
