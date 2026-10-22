import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const connectionString = process.env.INGREDIA_TEST_DATABASE_URL;
let enabled = false;
if (process.env.INGREDIA_ALLOW_DB_TESTS === "1" && connectionString) {
  const url = new URL(connectionString);
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  enabled = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname) && /_test$/i.test(databaseName);
}

describe.skipIf(!enabled)("tenant database migrations (isolated local *_test database only)", () => {
  let client: Client;
  let ownerUserId: string;
  let provisionTenant: (input: { tenantId: string; name: string; ownerUserId: string; idempotencyKey: string }) => Promise<{ tenantId: string; schemaName: string }>;
  let migrateTenantSchema: (tenantId: string) => Promise<void>;
  const createdTenants: Array<{ tenantId: string; schemaName: string }> = [];

  beforeAll(async () => {
    if (!connectionString) throw new Error("INGREDIA_TEST_DATABASE_URL is required");
    process.env.TENANT_PROVISIONING_DATABASE_URL = connectionString;
    const provisioning = await import("../../src/server/database/tenant-provisioning");
    provisionTenant = provisioning.provisionTenant;
    migrateTenantSchema = provisioning.migrateTenantSchema;
    client = new Client({ connectionString });
    await client.connect();
    const prerequisites = await client.query(
      "SELECT to_regclass('public.users') AS users, to_regclass('public.tenants') AS tenants, to_regclass('public.memberships') AS memberships, to_regclass('public.idempotency_records') AS idempotency, to_regclass('public.tenant_provisioning_requests') AS provisioning_requests",
    );
    if (Object.values(prerequisites.rows[0] as Record<string, string | null>).some((value) => !value)) {
      throw new Error("Run the reviewed global Prisma migrations against this disposable test database first");
    }
    const user = await client.query<{ id: string }>(
      "INSERT INTO public.users (email, password_hash) VALUES ($1, 'test-only-hash') RETURNING id",
      [`migration-test-${randomUUID()}@example.invalid`],
    );
    ownerUserId = user.rows[0].id;
  }, 30_000);

  afterAll(async () => {
    if (!client) return;
    for (const tenant of createdTenants) {
      const schema = tenant.schemaName;
      if (!/^tenant_[a-f0-9]{32}$/.test(schema)) continue;
      await client.query("DELETE FROM public.idempotency_records WHERE tenant_id = $1", [tenant.tenantId]);
      await client.query("DELETE FROM public.tenant_provisioning_requests WHERE tenant_id = $1", [tenant.tenantId]);
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await client.query("DELETE FROM public.tenants WHERE id = $1", [tenant.tenantId]);
    }
    if (ownerUserId) await client.query("DELETE FROM public.users WHERE id = $1", [ownerUserId]);
    await client.end();
  }, 30_000);

  async function createTenant(name: string, idempotencyKey: string = randomUUID(), tenantId: string = randomUUID()) {
    const tenant = await provisionTenant({ tenantId, name, ownerUserId, idempotencyKey });
    createdTenants.push(tenant);
    return tenant;
  }

  it("provisions the tenant tables and owner membership, and allocates distinct schemas", async () => {
    const first = await createTenant("Migration test A", "provision-first");
    const retry = await provisionTenant({ tenantId: first.tenantId, name: "Migration test A", ownerUserId, idempotencyKey: "provision-first" });
    const concurrentTenantId = randomUUID();
    const concurrent = await Promise.all([
      provisionTenant({ tenantId: concurrentTenantId, name: "Concurrent tenant", ownerUserId, idempotencyKey: "provision-concurrent" }),
      provisionTenant({ tenantId: concurrentTenantId, name: "Concurrent tenant", ownerUserId, idempotencyKey: "provision-concurrent" }),
    ]);
    createdTenants.push(concurrent[0]);
    const second = await createTenant("Migration test B");
    expect(retry).toEqual(first);
    expect(concurrent[1]).toEqual(concurrent[0]);
    expect(first.schemaName).not.toBe(second.schemaName);
    await expect(provisionTenant({ tenantId: first.tenantId, name: "Different name", ownerUserId, idempotencyKey: "provision-first" }))
      .rejects.toThrow("reused with a different request");
    const tables = await client.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1",
      [first.schemaName],
    );
    expect(new Set(tables.rows.map((row) => row.table_name))).toEqual(new Set([
      "_tenant_migrations", "ingredients", "units", "suppliers", "supplier_ingredients",
      "recipes", "recipe_ingredients", "purchases", "purchase_lines", "menu_items", "price_proposals",
    ]));
    const membership = await client.query(
      "SELECT role FROM public.memberships WHERE user_id = $1 AND tenant_id = $2",
      [ownerUserId, first.tenantId],
    );
    expect(membership.rows[0]?.role).toBe("OWNER");
  });

  it("keeps tenant data isolated and reapplying migrations is safe", async () => {
    const first = createdTenants[0] ?? await createTenant("Migration test isolation");
    const second = createdTenants[1] ?? await createTenant("Migration test isolation B");
    const unit = await client.query<{ id: string }>(
      `INSERT INTO "${first.schemaName}".units (name, abbreviation, measurement_type) VALUES ('kilogram', 'kg', 'MASS') RETURNING id`,
    );
    await client.query(
      `INSERT INTO "${first.schemaName}".ingredients (name, purchase_unit_id) VALUES ('Rice', $1)`,
      [unit.rows[0].id],
    );
    const otherTenantRows = await client.query(
      `SELECT count(*)::int AS count FROM "${second.schemaName}".ingredients WHERE name = 'Rice'`,
    );
    expect(otherTenantRows.rows[0].count).toBe(0);
    await migrateTenantSchema(first.tenantId);
    const stillOne = await client.query(
      `SELECT count(*)::int AS count FROM "${first.schemaName}".ingredients WHERE name = 'Rice'`,
    );
    expect(stillOne.rows[0].count).toBe(1);
  });

  it("applies a new version to an existing tenant without changing another tenant", async () => {
    const tenantId = randomUUID();
    const schemaName = `tenant_${tenantId.replaceAll("-", "")}`;
    await client.query("BEGIN");
    try {
      await client.query(
        "INSERT INTO public.tenants (id, name, schema_name) VALUES ($1, 'Legacy migration fixture', $2)",
        [tenantId, schemaName],
      );
      await client.query(
        "INSERT INTO public.memberships (user_id, tenant_id, role) VALUES ($1, $2, 'OWNER')",
        [ownerUserId, tenantId],
      );
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      await client.query(`SET LOCAL search_path TO "${schemaName}", public`);
      const firstMigration = await readFile(
        path.join(process.cwd(), "prisma", "tenant-migrations", "001_ingredients.sql"),
        "utf8",
      );
      await client.query(firstMigration);
      await client.query(
        `INSERT INTO "${schemaName}".ingredients (name, unit) VALUES ('Legacy rice', 'kg')`,
      );
      await client.query(`CREATE TABLE "${schemaName}"."_tenant_migrations" (
        version TEXT PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      const checksum = createHash("sha256").update(firstMigration).digest("hex");
      await client.query(
        `INSERT INTO "${schemaName}"."_tenant_migrations" (version, checksum) VALUES ('001_ingredients', $1)`,
        [checksum],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    createdTenants.push({ tenantId, schemaName });

    await migrateTenantSchema(tenantId);
    const migratedIngredient = await client.query<{ unit: string; measurement_type: string }>(
      `SELECT u.abbreviation AS unit, u.measurement_type FROM "${schemaName}".ingredients i JOIN "${schemaName}".units u ON u.id = i.purchase_unit_id WHERE i.name = 'Legacy rice'`,
    );
    expect(migratedIngredient.rows[0]).toEqual({ unit: "kg", measurement_type: "MASS" });
  });

  it("enforces tenant foreign keys, preserves purchase prices, and rejects duplicate idempotency claims", async () => {
    const tenant = createdTenants[0] ?? await createTenant("Migration test constraints");
    const schema = `"${tenant.schemaName}"`;
    await expect(client.query(
      `INSERT INTO ${schema}.recipe_ingredients (recipe_id, ingredient_id, quantity, unit_id) VALUES ($1, $2, 1, $3)`,
      [randomUUID(), randomUUID(), randomUUID()],
    )).rejects.toMatchObject({ code: "23503" });

    const unit = await client.query<{ id: string }>(
      `INSERT INTO ${schema}.units (name, abbreviation, measurement_type) VALUES ('kilogram', 'kg-price-test', 'MASS') RETURNING id`,
    );
    const ingredient = await client.query<{ id: string }>(
      `INSERT INTO ${schema}.ingredients (name, purchase_unit_id) VALUES ('Flour', $1) RETURNING id`,
      [unit.rows[0].id],
    );
    const supplier = await client.query<{ id: string }>(
      `INSERT INTO ${schema}.suppliers (name) VALUES ('Supplier') RETURNING id`,
    );
    await client.query(
      `INSERT INTO ${schema}.supplier_ingredients (supplier_id, ingredient_id, last_known_unit_price, currency_code) VALUES ($1, $2, 4.50, 'USD')`,
      [supplier.rows[0].id, ingredient.rows[0].id],
    );
    await client.query(
      `INSERT INTO ${schema}.supplier_ingredients (supplier_id, ingredient_id, purchase_unit_id) VALUES ($1, $2, $3)`,
      [supplier.rows[0].id, ingredient.rows[0].id, unit.rows[0].id],
    );
    await expect(client.query(
      `INSERT INTO ${schema}.supplier_ingredients (supplier_id, ingredient_id, purchase_unit_id) VALUES ($1, $2, $3)`,
      [supplier.rows[0].id, ingredient.rows[0].id, unit.rows[0].id],
    )).rejects.toMatchObject({ code: "23505" });
    const purchase = await client.query<{ id: string }>(
      `INSERT INTO ${schema}.purchases (supplier_id, purchase_date, currency_code) VALUES ($1, CURRENT_TIMESTAMP, 'USD') RETURNING id`,
      [supplier.rows[0].id],
    );
    const line = await client.query<{ id: string; line_total: string }>(
      `INSERT INTO ${schema}.purchase_lines (purchase_id, ingredient_id, quantity, unit_id, unit_price) VALUES ($1, $2, 2, $3, 3.25) RETURNING id, line_total`,
      [purchase.rows[0].id, ingredient.rows[0].id, unit.rows[0].id],
    );
    expect(line.rows[0].line_total).toBe("6.5000");
    await client.query(`UPDATE ${schema}.purchases SET status = 'CONFIRMED' WHERE id = $1`, [purchase.rows[0].id]);
    await expect(client.query(`UPDATE ${schema}.purchase_lines SET unit_price = 8 WHERE id = $1`, [line.rows[0].id]))
      .rejects.toMatchObject({ code: "23514" });
    await expect(client.query(`UPDATE ${schema}.purchases SET invoice_number = 'changed' WHERE id = $1`, [purchase.rows[0].id]))
      .rejects.toMatchObject({ code: "23514" });
    await client.query(
      `UPDATE ${schema}.supplier_ingredients SET last_known_unit_price = 9.99 WHERE supplier_id = $1 AND ingredient_id = $2`,
      [supplier.rows[0].id, ingredient.rows[0].id],
    );
    const historical = await client.query<{ unit_price: string; line_total: string }>(
      `SELECT unit_price, line_total FROM ${schema}.purchase_lines WHERE id = $1`,
      [line.rows[0].id],
    );
    expect(historical.rows[0]).toEqual({ unit_price: "3.2500", line_total: "6.5000" });

    const record = [tenant.tenantId, "test.create", randomUUID(), "sha256:test", new Date(Date.now() + 60_000)];
    await client.query(
      "INSERT INTO public.idempotency_records (tenant_id, operation, key, request_hash, expires_at) VALUES ($1, $2, $3, $4, $5)",
      record,
    );
    await expect(client.query(
      "INSERT INTO public.idempotency_records (tenant_id, operation, key, request_hash, expires_at) VALUES ($1, $2, $3, $4, $5)",
      record,
    )).rejects.toMatchObject({ code: "23505" });
  });
});
