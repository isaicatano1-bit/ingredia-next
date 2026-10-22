import { z } from "zod";
import { createSupplierSchema } from "@/server/features/suppliers/schemas/supplier";
import { failure } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";
import { createSupplier, listSuppliers } from "@/server/features/suppliers/supplier-service";
import { enforceRateLimit } from "@/server/security/rate-limit";
const querySchema = z.object({ page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(25),search:z.string().trim().max(120).optional() });

export async function GET(request: Request): Promise<Response> {
  try {
    const { tenant } = await resolveTenant(request);
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid pagination or search parameters."}},{status:400});
    const {page,limit,search}=parsed.data; const result=await listSuppliers(tenant,limit,(page-1)*limit,search);
    return Response.json({data:result.items,meta:{page,limit,total:result.total}});
  } catch(error) { return failure(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request); const {user,tenant}=await resolveTenant(request,["OWNER","ADMIN"]);
    await enforceRateLimit("suppliers.create",`${tenant.tenantId}:${user.id}`,20);
    const key=request.headers.get("idempotency-key")?.trim(); if(!key||key.length>200) return Response.json({error:{code:"IDEMPOTENCY_KEY_REQUIRED",message:"A valid Idempotency-Key header is required."}},{status:400});
    const parsed=createSupplierSchema.safeParse(await request.json()); if(!parsed.success) return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid supplier data.",details:parsed.error.issues}},{status:400});
    const result=await createSupplier(tenant,parsed.data,key);
    return Response.json({data:result.supplier},{status:result.status,headers:result.replayed?{"Idempotency-Replayed":"true"}:{}});
  } catch(error) { return failure(error); }
}
