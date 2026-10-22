import "server-only";
import type { PoolClient } from "pg";
import { AppError } from "@/server/api/errors/app-error";
import { withTenantClient } from "@/server/database/tenant-pool";
import type { TenantContext } from "@/server/tenancy/tenant-context";

export type RecipeInput={name:string;description?:string;yieldQuantity:number;yieldUnitId:string;ingredients:Array<{ingredientId:string;quantity:number;unitId:string;preparationNote?:string}>};
type RecipeRow={id:string;name:string;description:string|null;yield_quantity:string;yield_unit_id:string;yield_unit_name:string;yield_unit_abbreviation:string;created_at:Date};
type RecipeItem={id:string;ingredientId:string;ingredientName:string;quantity:string;unitId:string;unitName:string;unitAbbreviation:string;preparationNote:string|null};
type RecipeDto=ReturnType<typeof recipeDto>;
function recipeDto(row:RecipeRow,items:RecipeItem[]){return{id:row.id,name:row.name,description:row.description,yieldQuantity:Number(row.yield_quantity),yieldUnit:{id:row.yield_unit_id,name:row.yield_unit_name,abbreviation:row.yield_unit_abbreviation},ingredients:items.map(x=>({id:x.id,ingredientId:x.ingredientId,ingredientName:x.ingredientName,quantity:Number(x.quantity),unit:{id:x.unitId,name:x.unitName,abbreviation:x.unitAbbreviation},preparationNote:x.preparationNote})),createdAt:row.created_at.toISOString()};}
async function loadRecipe(client:PoolClient,id:string):Promise<RecipeDto>{
  const recipe=await client.query<RecipeRow>(`SELECT r.id,r.name,r.description,r.yield_quantity,r.yield_unit_id,u.name yield_unit_name,u.abbreviation yield_unit_abbreviation,r.created_at FROM recipes r JOIN units u ON u.id=r.yield_unit_id WHERE r.id=$1 AND r.archived_at IS NULL`,[id]);
  if(!recipe.rows[0])throw new AppError("Recipe not found.",404,"NOT_FOUND");
  const items=await client.query<RecipeItem>(`SELECT ri.id,ri.ingredient_id "ingredientId",i.name "ingredientName",ri.quantity::text,ri.unit_id "unitId",u.name "unitName",u.abbreviation "unitAbbreviation",ri.preparation_note "preparationNote" FROM recipe_ingredients ri JOIN ingredients i ON i.id=ri.ingredient_id JOIN units u ON u.id=ri.unit_id WHERE ri.recipe_id=$1 ORDER BY ri.created_at`,[id]);
  return recipeDto(recipe.rows[0],items.rows);
}
export async function createRecipe(tenant:TenantContext,input:RecipeInput):Promise<RecipeDto>{return withTenantClient(tenant,async(client)=>{
  const refs=await client.query<{id:string}>("SELECT id FROM units WHERE id=$1",[input.yieldUnitId]);if(!refs.rowCount)throw new AppError("Yield unit not found.",422,"INVALID_UNIT");
  for(const item of input.ingredients){const [ing,unit]=await Promise.all([client.query("SELECT 1 FROM ingredients WHERE id=$1 AND archived_at IS NULL",[item.ingredientId]),client.query("SELECT 1 FROM units WHERE id=$1",[item.unitId])]);if(!ing.rowCount)throw new AppError("Recipe ingredient not found.",422,"INVALID_INGREDIENT");if(!unit.rowCount)throw new AppError("Recipe measurement unit not found.",422,"INVALID_UNIT");}
  const inserted=await client.query<{id:string}>("INSERT INTO recipes(name,description,yield_quantity,yield_unit_id) VALUES($1,$2,$3,$4) RETURNING id",[input.name,input.description??null,input.yieldQuantity,input.yieldUnitId]);
  for(const item of input.ingredients)await client.query("INSERT INTO recipe_ingredients(recipe_id,ingredient_id,quantity,unit_id,preparation_note) VALUES($1,$2,$3,$4,$5)",[inserted.rows[0].id,item.ingredientId,item.quantity,item.unitId,item.preparationNote??null]);
  return loadRecipe(client,inserted.rows[0].id);
});}
export async function replaceRecipe(tenant:TenantContext,id:string,input:RecipeInput):Promise<RecipeDto>{return withTenantClient(tenant,async(client)=>{
  const exists=await client.query("SELECT 1 FROM recipes WHERE id=$1 AND archived_at IS NULL FOR UPDATE",[id]);if(!exists.rowCount)throw new AppError("Recipe not found.",404,"NOT_FOUND");
  const refs=await client.query("SELECT 1 FROM units WHERE id=$1",[input.yieldUnitId]);if(!refs.rowCount)throw new AppError("Yield unit not found.",422,"INVALID_UNIT");
  for(const item of input.ingredients){const [ing,unit]=await Promise.all([client.query("SELECT 1 FROM ingredients WHERE id=$1 AND archived_at IS NULL",[item.ingredientId]),client.query("SELECT 1 FROM units WHERE id=$1",[item.unitId])]);if(!ing.rowCount)throw new AppError("Recipe ingredient not found.",422,"INVALID_INGREDIENT");if(!unit.rowCount)throw new AppError("Recipe measurement unit not found.",422,"INVALID_UNIT");}
  await client.query("UPDATE recipes SET name=$2,description=$3,yield_quantity=$4,yield_unit_id=$5,updated_at=now() WHERE id=$1",[id,input.name,input.description??null,input.yieldQuantity,input.yieldUnitId]);
  await client.query("DELETE FROM recipe_ingredients WHERE recipe_id=$1",[id]);
  for(const item of input.ingredients)await client.query("INSERT INTO recipe_ingredients(recipe_id,ingredient_id,quantity,unit_id,preparation_note) VALUES($1,$2,$3,$4,$5)",[id,item.ingredientId,item.quantity,item.unitId,item.preparationNote??null]);
  return loadRecipe(client,id);
});}
export async function listRecipes(tenant:TenantContext,limit:number,offset:number,search?:string){return withTenantClient(tenant,async(client)=>{const pat=search?`%${search}%`:null;const [ids,count]=await Promise.all([client.query<{id:string}>("SELECT id FROM recipes WHERE archived_at IS NULL AND ($3::text IS NULL OR name ILIKE $3) ORDER BY name LIMIT $1 OFFSET $2",[limit,offset,pat]),client.query<{total:string}>("SELECT count(*)::text total FROM recipes WHERE archived_at IS NULL AND ($1::text IS NULL OR name ILIKE $1)",[pat])]);const items=[];for(const row of ids.rows)items.push(await loadRecipe(client,row.id));return{items,total:Number(count.rows[0].total)};});}
export async function getRecipe(tenant:TenantContext,id:string){return withTenantClient(tenant,(client)=>loadRecipe(client,id));}
export async function updateRecipe(tenant:TenantContext,id:string,input:{name?:string;description?:string|null}){return withTenantClient(tenant,async(client)=>{const result=await client.query("UPDATE recipes SET name=COALESCE($2,name),description=CASE WHEN $3::boolean THEN $4 ELSE description END,updated_at=now() WHERE id=$1 AND archived_at IS NULL RETURNING id",[id,input.name??null,Object.hasOwn(input,"description"),input.description??null]);if(!result.rowCount)throw new AppError("Recipe not found.",404,"NOT_FOUND");return loadRecipe(client,id);});}
export async function archiveRecipe(tenant:TenantContext,id:string){return withTenantClient(tenant,async(client)=>{const r=await client.query("UPDATE recipes SET archived_at=now(),updated_at=now() WHERE id=$1 AND archived_at IS NULL",[id]);if(!r.rowCount)throw new AppError("Recipe not found.",404,"NOT_FOUND");});}
