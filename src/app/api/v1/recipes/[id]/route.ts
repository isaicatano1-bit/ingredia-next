import { z } from "zod";
import { recipeInputSchema, recipePatchSchema } from "@/features/recipes/schemas/recipe";
import { AppError } from "@/server/api/errors/app-error";
import { failure, success } from "@/server/api/responses/json";
import { resolveTenant } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/auth/session";
import { archiveRecipe, getRecipe, replaceRecipe, updateRecipe } from "@/server/features/recipes/recipe-repository";
type Context={params:Promise<{id:string}>};
async function id(context:Context){const result=z.string().uuid().safeParse((await context.params).id);if(!result.success)throw new AppError("Invalid recipe ID.",400,"INVALID_ID");return result.data;}
export async function GET(request:Request,context:Context){try{const {tenant}=await resolveTenant(request);return success(await getRecipe(tenant,await id(context)));}catch(error){return failure(error);}}
export async function PATCH(request:Request,context:Context){try{assertSameOrigin(request);const {tenant}=await resolveTenant(request,["OWNER","ADMIN"]);const parsed=recipePatchSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid recipe data."}},{status:400});return success(await updateRecipe(tenant,await id(context),parsed.data));}catch(error){return failure(error);}}
export async function PUT(request:Request,context:Context){try{assertSameOrigin(request);const {tenant}=await resolveTenant(request,["OWNER","ADMIN"]);const parsed=recipeInputSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:{code:"VALIDATION_ERROR",message:"Invalid recipe data."}},{status:400});return success(await replaceRecipe(tenant,await id(context),parsed.data));}catch(error){return failure(error);}}
export async function DELETE(request:Request,context:Context){try{assertSameOrigin(request);const {tenant}=await resolveTenant(request,["OWNER","ADMIN"]);await archiveRecipe(tenant,await id(context));return new Response(null,{status:204});}catch(error){return failure(error);}}
