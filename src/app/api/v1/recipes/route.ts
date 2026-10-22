import { z } from "zod";
import { recipeInputSchema } from "@/server/features/recipes/schemas/recipe";
import { failure } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";
import { createRecipe, listRecipes } from "@/server/features/recipes/recipe-service";
import { enforceRateLimit } from "@/server/security/rate-limit";
const querySchema=z.object({page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(25),search:z.string().trim().max(120).optional()});
export async function GET(request:Request){try{const {tenant}=await resolveTenant(request);const parsed=querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));if(!parsed.success)return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid pagination or search parameters."}},{status:400});const {page,limit,search}=parsed.data;const result=await listRecipes(tenant,limit,(page-1)*limit,search);return Response.json({data:result.items,meta:{page,limit,total:result.total}});}catch(error){return failure(error);}}
export async function POST(request:Request){try{assertSameOrigin(request);const {user,tenant}=await resolveTenant(request,["OWNER","ADMIN"]);await enforceRateLimit("recipes.create",`${tenant.tenantId}:${user.id}`,15);const parsed=recipeInputSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid recipe data.",details:parsed.error.issues}},{status:400});return Response.json({data:await createRecipe(tenant,parsed.data)},{status:201});}catch(error){return failure(error);}}
