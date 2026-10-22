import { failure, success } from "@/server/api/responses/json";
import { authenticate } from "@/server/auth/authorization";
import { prisma } from "@/server/database/prisma";
import { createHash } from "node:crypto";
import { z } from "zod";
import { assertSameOrigin } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { provisionTenant } from "@/server/database/tenant-provisioning";

const createSchema=z.object({name:z.string().trim().min(2).max(120)}).strict();

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await authenticate(request);
    const rows = await prisma.membership.findMany({ where: { userId: user.id }, select: { role: true, tenant: { select: { id: true, name: true, createdAt: true } } }, orderBy: { createdAt: "asc" } });
    return success(rows.map(({ role, tenant }) => ({ ...tenant, role })));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const user=await authenticate(request);
    const key=request.headers.get("idempotency-key")?.trim();
    if(!key||key.length>200) return Response.json({error:{code:"IDEMPOTENCY_KEY_REQUIRED",message:"A valid Idempotency-Key header is required."}},{status:400});
    const parsed=createSchema.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid tenant data."}},{status:400});
    await enforceRateLimit("tenants.create",user.id,5,3600);
    // Stable server-derived UUID makes provisioning retries resolve to the same request.
    const raw=createHash("sha256").update(`${user.id}:${key}`).digest("hex").slice(0,32).split("");
    raw[12]="4"; raw[16]=((Number.parseInt(raw[16],16)&3)|8).toString(16);
    const tenantId=`${raw.join("").slice(0,8)}-${raw.join("").slice(8,12)}-${raw.join("").slice(12,16)}-${raw.join("").slice(16,20)}-${raw.join("").slice(20)}`;
    const tenant=await provisionTenant({tenantId,name:parsed.data.name,ownerUserId:user.id,idempotencyKey:key});
    return Response.json({data:{id:tenant.tenantId,name:parsed.data.name,role:"OWNER"}},{status:201});
  } catch(error) {
    if(error instanceof Error&&error.message.includes("idempotency key was reused")) return Response.json({error:{code:"IDEMPOTENCY_CONFLICT",message:"Idempotency key was already used with a different request."}},{status:409});
    if(typeof error==="object"&&error!==null&&"code" in error&&error.code==="23505") return Response.json({error:{code:"CONFLICT",message:"Tenant could not be created due to a conflict."}},{status:409});
    return failure(error);
  }
}
