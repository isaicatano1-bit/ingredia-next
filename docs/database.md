# Database

Global identity, tenant membership, and idempotency metadata live in PostgreSQL `public` and are modeled in `prisma/schema.prisma`. Run `npm run db:generate` and `npm run db:migrate` after setting `DATABASE_URL` and `DIRECT_URL`.

Tenant business tables live in separate PostgreSQL schemas. Use Prisma for global relational data. Use `pg` through `withTenantClient` for dynamic tenant schema access. Its schema value must come from a server-side membership lookup and pass the strict `tenant_<32 lowercase hex>` validator. SQL values remain parameterized. Tenant migrations are in `prisma/tenant-migrations` and must be applied by a privileged provisioning runner that records applied versions before application traffic is routed to a new tenant. Existing schemas must receive each new version in order.

Pool sizing must account for all application instances and Supabase connection limits. Use a pooler appropriate to the deployed environment; never create a pool per request. The current adapter has one process pool and transaction-local search path; it needs production connection-limit tuning before scaling.
