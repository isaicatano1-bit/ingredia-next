import "server-only";
import type { PoolClient } from "pg";
import type { RecipeHeaderRow, RecipeIngredientRow } from "./recipe-mapper";
import type { RecipeInput } from "./recipe-types";

const HEADER_SELECT = `SELECT r.id,r.name,r.description,r.yield_quantity::text,r.yield_unit_id,
  u.name AS yield_unit_name,u.abbreviation AS yield_unit_abbreviation,r.created_at
  FROM recipes r JOIN units u ON u.id=r.yield_unit_id`;
const INGREDIENT_SELECT = `SELECT ri.id,ri.ingredient_id,i.name AS ingredient_name,ri.quantity::text,
  ri.unit_id,u.name AS unit_name,u.abbreviation AS unit_abbreviation,ri.preparation_note
  FROM recipe_ingredients ri JOIN ingredients i ON i.id=ri.ingredient_id
  JOIN units u ON u.id=ri.unit_id`;

export async function findRecipeReferences(client: PoolClient, input: RecipeInput) {
  const [yieldUnit, references] = await Promise.all([
    client.query("SELECT 1 FROM units WHERE id=$1", [input.yieldUnitId]),
    Promise.all(input.ingredients.map(async (item) => {
      const [ingredient, unit] = await Promise.all([
        client.query("SELECT 1 FROM ingredients WHERE id=$1 AND archived_at IS NULL", [item.ingredientId]),
        client.query("SELECT 1 FROM units WHERE id=$1", [item.unitId]),
      ]);
      return { ingredientFound: Boolean(ingredient.rowCount), unitFound: Boolean(unit.rowCount) };
    })),
  ]);
  return { yieldUnitFound: Boolean(yieldUnit.rowCount), references };
}

export async function findRecipe(client: PoolClient, id: string, lockForUpdate = false) {
  const header = await client.query<RecipeHeaderRow>(
    `${HEADER_SELECT} WHERE r.id=$1 AND r.archived_at IS NULL${lockForUpdate ? " FOR UPDATE OF r" : ""}`, [id],
  );
  if (!header.rows[0]) return null;
  const ingredients = await client.query<RecipeIngredientRow>(`${INGREDIENT_SELECT} WHERE ri.recipe_id=$1 ORDER BY ri.created_at`, [id]);
  return { header: header.rows[0], ingredients: ingredients.rows };
}

export async function insertRecipe(client: PoolClient, input: RecipeInput) {
  const result = await client.query<{ id: string }>(
    `INSERT INTO recipes(name,description,yield_quantity,yield_unit_id) VALUES($1,$2,$3,$4) RETURNING id`,
    [input.name,input.description??null,input.yieldQuantity,input.yieldUnitId],
  );
  return result.rows[0].id;
}

export async function insertRecipeIngredient(client: PoolClient, recipeId: string, item: RecipeInput["ingredients"][number]) {
  await client.query(
    `INSERT INTO recipe_ingredients(recipe_id,ingredient_id,quantity,unit_id,preparation_note) VALUES($1,$2,$3,$4,$5)`,
    [recipeId,item.ingredientId,item.quantity,item.unitId,item.preparationNote??null],
  );
}

export async function listRecipeIds(client: PoolClient, limit: number, offset: number, search?: string) {
  const pattern = search ? `%${search}%` : null;
  const [ids, count] = await Promise.all([
    client.query<{ id: string }>("SELECT id FROM recipes WHERE archived_at IS NULL AND ($3::text IS NULL OR name ILIKE $3) ORDER BY name LIMIT $1 OFFSET $2", [limit,offset,pattern]),
    client.query<{ total: string }>("SELECT count(*)::text AS total FROM recipes WHERE archived_at IS NULL AND ($1::text IS NULL OR name ILIKE $1)", [pattern]),
  ]);
  return { ids: ids.rows.map((row) => row.id), total: Number(count.rows[0].total) };
}

export async function replaceRecipeHeader(client: PoolClient, id: string, input: RecipeInput) {
  await client.query(
    "UPDATE recipes SET name=$2,description=$3,yield_quantity=$4,yield_unit_id=$5,updated_at=now() WHERE id=$1",
    [id,input.name,input.description??null,input.yieldQuantity,input.yieldUnitId],
  );
}

export async function deleteRecipeIngredients(client: PoolClient, id: string) {
  await client.query("DELETE FROM recipe_ingredients WHERE recipe_id=$1", [id]);
}

export async function updateRecipeDetails(client: PoolClient,id: string,input: { name?: string; description?: string | null }) {
  const result = await client.query(
    `UPDATE recipes SET name=COALESCE($2,name),description=CASE WHEN $3 THEN $4 ELSE description END,updated_at=now()
     WHERE id=$1 AND archived_at IS NULL RETURNING id`,
    [id,input.name??null,Object.hasOwn(input,"description"),input.description??null],
  );
  return Boolean(result.rowCount);
}

export async function archiveRecipe(client: PoolClient,id: string) {
  const result = await client.query("UPDATE recipes SET archived_at=now(),updated_at=now() WHERE id=$1 AND archived_at IS NULL", [id]);
  return Boolean(result.rowCount);
}
