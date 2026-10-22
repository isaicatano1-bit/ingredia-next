# Multitenancy

`public.tenants` maps an opaque UUID to a generated schema name: `tenant_` plus the UUID's 32 lowercase hexadecimal digits. Provisioning accepts only a server-minted internal UUID; clients never provide a schema name.

After cookie authentication, the resolver reads the selected UUID from `x-tenant-id` (or `tenantId` on collection GETs), checks membership and role against `public` on every request, and verifies the canonical schema mapping. A tenant ID is only a selector; membership is the authorization proof. The `pg` tenant pool re-derives the schema from the UUID and uses a validated identifier plus transaction-local `search_path`. All SQL values are bound parameters.

`POST /api/v1/tenants` authenticates the caller, requires an owner-scoped idempotency key, derives a stable internal UUID from owner and key, then invokes the server-only provisioning service. It does not accept a tenant ID or schema name. `migrateTenantSchema(tenantId)` remains an operator-controlled deployment operation that verifies the tenant row before applying only that tenant's pending migrations.

The privileged provisioning connection uses `TENANT_PROVISIONING_DATABASE_URL`, falling back to `DIRECT_URL`. Give it schema creation rights; keep the runtime pool least-privileged. Credentials stay server-side and out of `NEXT_PUBLIC_*` variables.
