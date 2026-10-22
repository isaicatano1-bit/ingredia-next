import { purchaseIdSchema,purchasePatchSchema } from "@/server/features/purchases/schemas/purchase";
import { AppError } from "@/server/api/errors/app-error";
import { failure,success } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";
import { deletePurchaseDraft,getPurchase,updatePurchaseDraft } from "@/server/features/purchases/purchase-service";
type Context={params:Promise<{id:string}>};
async function id(c:Context){const p=purchaseIdSchema.safeParse((await c.params).id);if(!p.success)throw new AppError("Invalid purchase ID.",400,"INVALID_ID");return p.data;}
export async function GET(request:Request,c:Context){try{const {tenant}=await resolveTenant(request);return success(await getPurchase(tenant,await id(c)));}catch(e){return failure(e);}}
export async function PATCH(request:Request,c:Context){try{assertSameOrigin(request);const {tenant}=await resolveTenant(request,["OWNER","ADMIN"]);const p=purchasePatchSchema.safeParse(await request.json());if(!p.success)return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid purchase data.",details:p.error.issues}},{status:400});return success(await updatePurchaseDraft(tenant,await id(c),p.data));}catch(e){return failure(e);}}
export async function DELETE(request:Request,c:Context){try{assertSameOrigin(request);const {tenant}=await resolveTenant(request,["OWNER","ADMIN"]);await deletePurchaseDraft(tenant,await id(c));return new Response(null,{status:204});}catch(e){return failure(e);}}
