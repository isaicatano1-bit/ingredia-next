import { purchaseIdSchema } from "@/server/features/purchases/schemas/purchase";
import { AppError } from "@/server/api/errors/app-error";
import { failure,success } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";
import { confirmPurchase } from "@/server/features/purchases/purchase-service";
type Context={params:Promise<{id:string}>};
export async function POST(request:Request,c:Context){try{assertSameOrigin(request);const {tenant}=await resolveTenant(request,["OWNER","ADMIN"]);const parsed=purchaseIdSchema.safeParse((await c.params).id);if(!parsed.success)throw new AppError("Invalid purchase ID.",400,"INVALID_ID");return success(await confirmPurchase(tenant,parsed.data));}catch(e){return failure(e);}}
