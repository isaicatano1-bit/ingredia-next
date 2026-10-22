import { z } from "zod";
import { failure, success } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";

const schema = z.object({ tenantId: z.string().uuid() }).strict();

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid tenant selection." } }, { status: 400 });
    const url = new URL(request.url);
    url.searchParams.set("tenantId", parsed.data.tenantId);
    const selected = await resolveTenant(new Request(url, { headers: request.headers }));
    return success({ tenant: { id: selected.tenant.tenantId, name: selected.tenant.name, role: selected.tenant.role } });
  } catch (error) { return failure(error); }
}
