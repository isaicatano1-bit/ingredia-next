import { supplierIngredientIdSchema,patchSupplierIngredientSchema } from "@/server/features/suppliers/schemas/supplier-ingredient";
import { AppError } from "@/server/api/errors/app-error";
import { failure,success } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";
import { deleteSupplierIngredient,getSupplierIngredient,updateSupplierIngredient } from "@/server/features/suppliers/supplier-ingredient-service";
type Context={params:Promise<{id:string}>};
async function id(c:Context){const p=supplierIngredientIdSchema.safeParse((await c.params).id);if(!p.success)throw new AppError("Invalid supplier-ingredient ID.",400,"INVALID_ID");return p.data;}
export async function GET(request:Request,c:Context){try{const {tenant}=await resolveTenant(request);return success(await getSupplierIngredient(tenant,await id(c)));}catch(e){return failure(e);}}
export async function PATCH(request:Request,c:Context){try{assertSameOrigin(request);const {tenant}=await resolveTenant(request,["OWNER","ADMIN"]);const p=patchSupplierIngredientSchema.safeParse(await request.json());if(!p.success)return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid supplier-ingredient data.",details:p.error.issues}},{status:400});return success(await updateSupplierIngredient(tenant,await id(c),p.data));}catch(e){return failure(e);}}
export async function DELETE(request:Request,c:Context){try{assertSameOrigin(request);const {tenant}=await resolveTenant(request,["OWNER","ADMIN"]);await deleteSupplierIngredient(tenant,await id(c));return new Response(null,{status:204});}catch(e){return failure(e);}}
