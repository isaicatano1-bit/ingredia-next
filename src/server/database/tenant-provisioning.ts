import "server-only";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { env } from "@/server/config/env";
import { assertTenantId, assertTenantSchema, schemaForTenantId } from "@/server/tenancy/tenant-context";

type Migration = { version: string; sql: string; checksum: string };

async function loadMigrations(): Promise<Migration[]> {
  const directory = path.join(process.cwd(), "prisma", "tenant-migrations");
  const names = (await readdir(directory)).filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name)).sort();
  if (names.length === 0) throw new Error("No tenant SQL migrations were found");
  return Promise.all(names.map(async (name) => {
    const sql = await readFile(path.join(directory, name), "utf8");
    return {
      version: name.slice(0, -4),
      sql,
      checksum: createHash("sha256").update(sql).digest("hex"),
    };
  }));
}

function quoteTenantSchema(schemaName: string): string {
  return `"${assertTenantSchema(schemaName)}"`;
}

/** Must be called inside a transaction on the privileged provisioning connection. */
async function applyMigrationsInTransaction(client: Client, schemaName: string): Promise<void> {
  const quotedSchema = quoteTenantSchema(schemaName);
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [schemaName]);
  await client.query(`CREATE TABLE IF NOT EXISTS ${quotedSchema}."_tenant_migrations" (
    "version" TEXT PRIMARY KEY,
    "checksum" CHAR(64) NOT NULL,
    "applied_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await client.query(`SET LOCAL search_path TO ${quotedSchema}, public`);

  const migrations = await loadMigrations();
  const applied = await client.query<{ version: string; checksum: string }>(
    `SELECT version, checksum FROM ${quotedSchema}."_tenant_migrations" ORDER BY version`,
  );
  const appliedByVersion = new Map(applied.rows.map((row) => [row.version, row.checksum.trim()]));
  const knownVersions = new Set(migrations.map((migration) => migration.version));
  const unknownVersions = [...appliedByVersion.keys()].filter((version) => !knownVersions.has(version));
  if (unknownVersions.length > 0) {
    throw new Error(`Tenant schema has unknown migration versions: ${unknownVersions.join(", ")}`);
  }

  for (const migration of migrations) {
    const recordedChecksum = appliedByVersion.get(migration.version);
    if (recordedChecksum) {
      if (recordedChecksum !== migration.checksum) {
        throw new Error(`Tenant migration ${migration.version} was modified after it was applied`);
      }
      continue;
    }
    await client.query(migration.sql);
    await client.query(
      `INSERT INTO ${quotedSchema}."_tenant_migrations" (version, checksum) VALUES ($1, $2)`,
      [migration.version, migration.checksum],
    );
  }
}

function adminConnectionString(): string {
  const connectionString = env.TENANT_PROVISIONING_DATABASE_URL ?? env.DIRECT_URL;
  if (!connectionString) {
    throw new Error("TENANT_PROVISIONING_DATABASE_URL (or DIRECT_URL) is required for tenant migrations");
  }
  return connectionString;
}

/** Apply pending migrations to exactly the tenant identified by a validated internal UUID. */
export async function migrateTenantSchema(tenantIdInput: string): Promise<void> {
  const tenantId = assertTenantId(tenantIdInput);
  const schemaName = schemaForTenantId(tenantId);
  const quotedSchema = quoteTenantSchema(schemaName);
  const client = new Client({ connectionString: adminConnectionString() });
  await client.connect();
  try {
    await client.query("BEGIN");
    const tenant = await client.query<{ schema_name: string }>(
      "SELECT schema_name FROM public.tenants WHERE id = $1",
      [tenantId],
    );
    if (!tenant.rowCount) throw new Error("Tenant does not exist");
    if (tenant.rows[0].schema_name !== schemaName) {
      throw new Error("Stored tenant schema does not match its internally derived schema name");
    }
    const exists = await client.query<{ schema_name: string | null }>(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1",
      [schemaName],
    );
    if (!exists.rowCount) throw new Error(`Tenant schema ${schemaName} does not exist`);
    await client.query(`SET LOCAL search_path TO ${quotedSchema}, public`);
    await applyMigrationsInTransaction(client, schemaName);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

/** Create the global tenant, owner membership, schema and all tenant tables atomically. */
export async function provisionTenant(input: {
  tenantId: string;
  name: string;
  ownerUserId: string;
  idempotencyKey: string;
}): Promise<{ tenantId: string; schemaName: string }> {
  const tenantId = assertTenantId(input.tenantId);
  const schemaName = schemaForTenantId(tenantId);
  const name = input.name.trim();
  if (!name) throw new Error("Tenant name is required");
  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    throw new Error("A tenant provisioning idempotency key of 1 to 200 characters is required");
  }
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ tenantId, ownerUserId: input.ownerUserId, name }))
    .digest("hex");
  const quotedSchema = quoteTenantSchema(schemaName);
  const client = new Client({ connectionString: adminConnectionString() });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      `${input.ownerUserId}:${idempotencyKey}`,
    ]);
    const prior = await client.query<{ tenant_id: string; schema_name: string; request_hash: string }>(
      `SELECT r.request_hash, t.id AS tenant_id, t.schema_name
       FROM public.tenant_provisioning_requests AS r
       JOIN public.tenants AS t ON t.id = r.tenant_id
       WHERE r.owner_user_id = $1 AND r.key = $2`,
      [input.ownerUserId, idempotencyKey],
    );
    if (prior.rows[0]) {
      if (prior.rows[0].request_hash !== requestHash) {
        throw new Error("Tenant provisioning idempotency key was reused with a different request");
      }
      await client.query("COMMIT");
      return { tenantId: prior.rows[0].tenant_id, schemaName: prior.rows[0].schema_name };
    }

    const tenant = await client.query<{ id: string }>(
      "INSERT INTO public.tenants (id, name, schema_name) VALUES ($1, $2, $3) RETURNING id",
      [tenantId, name, schemaName],
    );
    if (tenant.rows[0]?.id !== tenantId) throw new Error("Tenant record was not created");
    await client.query(
      "INSERT INTO public.memberships (user_id, tenant_id, role) VALUES ($1, $2, 'OWNER')",
      [input.ownerUserId, tenantId],
    );
    await client.query(`CREATE SCHEMA ${quotedSchema}`);
    await client.query(`SET LOCAL search_path TO ${quotedSchema}, public`);
    await applyMigrationsInTransaction(client, schemaName);
    await client.query(
      `INSERT INTO public.tenant_provisioning_requests (owner_user_id, key, request_hash, tenant_id)
       VALUES ($1, $2, $3, $4)`,
      [input.ownerUserId, idempotencyKey, requestHash, tenantId],
    );
    await client.query("COMMIT");
    return { tenantId, schemaName };
  } catch (error) {
    await client.query("ROLLBACK");
    const databaseError = error as { code?: string; constraint?: string };
    if (databaseError.code === "23505" && databaseError.constraint === "tenant_provisioning_requests_owner_key") {
      const prior = await client.query<{ tenant_id: string; schema_name: string; request_hash: string }>(
        `SELECT r.request_hash, t.id AS tenant_id, t.schema_name
         FROM public.tenant_provisioning_requests AS r
         JOIN public.tenants AS t ON t.id = r.tenant_id
         WHERE r.owner_user_id = $1 AND r.key = $2`,
        [input.ownerUserId, idempotencyKey],
      );
      if (prior.rows[0]?.request_hash === requestHash) {
        return { tenantId: prior.rows[0].tenant_id, schemaName: prior.rows[0].schema_name };
      }
      if (prior.rows[0]) {
        throw new Error("Tenant provisioning idempotency key was reused with a different request");
      }
    }
    throw error;
  } finally {
    await client.end();
  }
}

