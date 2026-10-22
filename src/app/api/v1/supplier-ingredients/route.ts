import { z } from "zod";
import { createSupplierIngredientSchema } from "@/server/features/suppliers/schemas/supplier-ingredient";
import { failure } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";
import { createSupplierIngredient, listSupplierIngredients } from "@/server/features/suppliers/supplier-ingredient-service";
import { enforceRateLimit } from "@/server/security/rate-limit";
const querySchema=z.object({page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(25),supplierId:z.string().uuid().optional(),ingredientId:z.string().uuid().optional()});
export async function GET(request:Request):Promise<Response>{try{const {tenant}=await resolveTenant(request);const q=querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));if(!q.success)return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid pagination or filter parameters."}},{status:400});const {page,limit,...filter}=q.data;const result=await listSupplierIngredients(tenant,{limit,offset:(page-1)*limit,...filter});return Response.json({data:result.items,meta:{page,limit,total:result.total}});}catch(e){return failure(e);}}
export async function POST(request:Request):Promise<Response>{try{assertSameOrigin(request);const {user,tenant}=await resolveTenant(request,["OWNER","ADMIN"]);await enforceRateLimit("supplier-ingredients.create",`${tenant.tenantId}:${user.id}`,20);const parsed=createSupplierIngredientSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid supplier-ingredient data.",details:parsed.error.issues}},{status:400});return Response.json({data:await createSupplierIngredient(tenant,parsed.data)},{status:201});}catch(e){return failure(e);}}
