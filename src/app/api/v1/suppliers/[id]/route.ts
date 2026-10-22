import { z } from "zod";
import { patchSupplierSchema } from "@/features/suppliers/schemas/supplier";
import { AppError } from "@/server/api/errors/app-error";
import { failure, success } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";
import { archiveSupplier, getSupplier, updateSupplier } from "@/server/features/suppliers/supplier-repository";
type Context={params:Promise<{id:string}>};
async function id(context:Context){const result=z.string().uuid().safeParse((await context.params).id);if(!result.success)throw new AppError("Invalid supplier ID.",400,"INVALID_ID");return result.data;}
export async function GET(request:Request,context:Context){try{const {tenant}=await resolveTenant(request);return success(await getSupplier(tenant,await id(context)));}catch(error){return failure(error);}}
export async function PATCH(request:Request,context:Context){try{assertSameOrigin(request);const {tenant}=await resolveTenant(request,["OWNER","ADMIN"]);const parsed=patchSupplierSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid supplier data."}},{status:400});return success(await updateSupplier(tenant,await id(context),parsed.data));}catch(error){return failure(error);}}
export async function DELETE(request:Request,context:Context){try{assertSameOrigin(request);const {tenant}=await resolveTenant(request,["OWNER","ADMIN"]);await archiveSupplier(tenant,await id(context));return new Response(null,{status:204});}catch(error){return failure(error);}}
