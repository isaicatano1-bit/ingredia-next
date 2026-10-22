import "server-only";
import { Pool, type PoolClient } from "pg";
import { env } from "@/server/config/env";
import { assertTenantSchema, schemaForTenantId, type TenantContext } from "@/server/tenancy/tenant-context";

let pool: Pool | undefined;

function getPool(): Pool {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required for tenant data access");
  pool ??= new Pool({ connectionString: env.DATABASE_URL, max: 10 });
  return pool;
}

export async function withTenantClient<T>(
  tenant: TenantContext,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const schema = assertTenantSchema(tenant.schemaName);
  if (schemaForTenantId(tenant.tenantId) !== schema) throw new Error("Tenant schema does not match its internal tenant identifier");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    // Schema names cannot be SQL values. Validate the server-derived identifier and quote it.
    await client.query(`SET LOCAL search_path TO "${schema}", public`);
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
