import { unitIdSchema, patchUnitSchema } from "@/server/features/units/schemas/unit";
import { AppError } from "@/server/api/errors/app-error";
import { failure, success } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";
import { deleteUnit, getUnit, updateUnit } from "@/server/features/units/unit-repository";

type Context={params:Promise<{id:string}>};
async function id(context:Context){const parsed=unitIdSchema.safeParse((await context.params).id);if(!parsed.success)throw new AppError("Invalid unit ID.",400,"INVALID_ID");return parsed.data;}
export async function GET(request:Request,context:Context){try{const {tenant}=await resolveTenant(request);return success(await getUnit(tenant,await id(context)));}catch(error){return failure(error);}}
export async function PATCH(request:Request,context:Context){try{assertSameOrigin(request);const {tenant}=await resolveTenant(request,["OWNER","ADMIN"]);const parsed=patchUnitSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid unit data.",details:parsed.error.issues}},{status:400});return success(await updateUnit(tenant,await id(context),parsed.data));}catch(error){return failure(error);}}
export async function DELETE(request:Request,context:Context){try{assertSameOrigin(request);const {tenant}=await resolveTenant(request,["OWNER","ADMIN"]);await deleteUnit(tenant,await id(context));return new Response(null,{status:204});}catch(error){return failure(error);}}
