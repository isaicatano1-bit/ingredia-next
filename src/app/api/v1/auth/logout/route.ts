import { failure } from "@/server/api/responses/json";
import { assertSameOrigin, clearedSessionCookie, getCookie, revokeSession, SESSION_COOKIE } from "@/server/auth/session";
import { AppError } from "@/server/api/errors/app-error";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const token = getCookie(request, SESSION_COOKIE);
    if (token) {
      try {
        await revokeSession(token);
      } catch {
        const response = failure(new AppError("Logout could not be completed. Please retry.", 503, "SESSION_REVOCATION_UNAVAILABLE"));
        response.headers.append("Set-Cookie", clearedSessionCookie());
        return response;
      }
    }
    return new Response(null, { status: 204, headers: { "Set-Cookie": clearedSessionCookie() } });
  } catch (error) { return failure(error); }
}
