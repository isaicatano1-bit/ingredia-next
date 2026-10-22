import { credentialsSchema } from "@/server/auth/schemas/auth";
import { failure } from "@/server/api/responses/json";
import { authenticateCredentials } from "@/server/auth/auth-service";
import { issueSession, sessionCookie } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { assertSameOrigin } from "@/server/auth/session";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const body: unknown = await request.json();
    const parsed = credentialsSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid credentials." } }, { status: 400 });
    await enforceRateLimit("login", parsed.data.email, 8, 900);
    const user = await authenticateCredentials(parsed.data);
    const token = await issueSession(user.id);
    return Response.json({ data: { user } }, { headers: { "Set-Cookie": sessionCookie(token) } });
  } catch (error) { return failure(error); }
}
