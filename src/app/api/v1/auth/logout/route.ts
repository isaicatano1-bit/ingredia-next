import { failure } from "@/server/api/responses/json";
import { assertSameOrigin, clearedSessionCookie } from "@/server/auth/session";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    return new Response(null, { status: 204, headers: { "Set-Cookie": clearedSessionCookie() } });
  } catch (error) { return failure(error); }
}
