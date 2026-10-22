import { z } from "zod";
import { createUnitSchema, measurementTypes } from "@/server/features/units/schemas/unit";
import { failure } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";
import { createUnit, listUnits } from "@/server/features/units/unit-repository";
import { enforceRateLimit } from "@/server/security/rate-limit";

const querySchema = z.object({ page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(50),type:z.enum(measurementTypes).optional() });
export async function GET(request:Request):Promise<Response>{
  try{
    const {tenant}=await resolveTenant(request);
    const parsed=querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if(!parsed.success)return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid unit query."}},{status:400});
    const {page,limit,type}=parsed.data;const result=await listUnits(tenant,limit,(page-1)*limit,type);
    return Response.json({data:result.items,meta:{page,limit,total:result.total}});
  }catch(error){return failure(error);}
}

export async function POST(request:Request):Promise<Response>{
  try{
    assertSameOrigin(request);const {user,tenant}=await resolveTenant(request,["OWNER","ADMIN"]);
    await enforceRateLimit("units.create",`${tenant.tenantId}:${user.id}`,20);
    const parsed=createUnitSchema.safeParse(await request.json());
    if(!parsed.success)return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid unit data.",details:parsed.error.issues}},{status:400});
    return Response.json({data:await createUnit(tenant,parsed.data)},{status:201});
  }catch(error){return failure(error);}
}
