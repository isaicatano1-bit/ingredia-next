import "server-only";
import type { PoolClient } from "pg";
import type { CreateIngredientInput, Ingredient } from "@/features/ingredients/interfaces/ingredient";
import { withTenantClient } from "@/server/database/tenant-pool";
import type { TenantContext } from "@/server/tenancy/tenant-context";

export async function createIngredient(
  tenant: TenantContext,
  input: CreateIngredientInput,
): Promise<Ingredient> {
  return withTenantClient(tenant, async (client: PoolClient) => {
    const result = await client.query<{
      id: string;
      name: string;
      unit: string;
      created_at: Date;
    }>(
      "INSERT INTO ingredients (name, unit) VALUES ($1, $2) RETURNING id, name, unit, created_at",
      [input.name, input.unit],
    );
    const row = result.rows[0];
    return { id: row.id, name: row.name, unit: row.unit, createdAt: row.created_at.toISOString() };
  });
}
