# Ingredia

Ingredia is a multitenant restaurant management SaaS built as a feature first modular monolith with Next.js App Router and TypeScript.

## Local development

Requirements: Node.js 22+, npm, and Docker Compose.

1. Copy `.env.example` to `.env.local` and replace `JWT_SECRET` with a random secret.
2. Start local services with `docker compose up -d`.
3. Run `npm install`, `npm run db:generate`, and `npm run db:migrate`.
4. Start Next.js with `npm run dev`.

`DATABASE_URL` and `DIRECT_URL` should point at the local database for development. `DATABASE_URL` is used by the application and `DIRECT_URL` by Prisma migrations. Do not use a `NEXT_PUBLIC_` prefix for secrets. Supabase deployments should use the appropriate pooled URL for runtime and a direct URL for migrations.

## Commands

- `npm run lint` — ESLint
- `npm test` — Vitest unit tests
- `npm run build` — production build
- `npm run db:generate` — generate Prisma client
- `npm run db:migrate` — apply global Prisma migrations

Tenant SQL migrations are separate from Prisma migrations and currently require a privileged provisioning runner; there is no automatic tenant provisioning yet. Ingredient writes remain unavailable until authentication and authorized tenant resolution are implemented.

## Project map

- `src/app` — App Router pages, layouts, and versioned route handlers
- `src/features` — client safe feature contracts and validation
- `src/server` — server only services, repositories, database, and security
- `prisma` — shared schema and global migrations
- `prisma/tenant-migrations` — ordered tenant schema migrations
- `tests` — unit, integration, end to end, and security tests
- `docs` — architecture and operational decisions

Read [architecture](docs/architecture.md), [database](docs/database.md), and [multitenancy](docs/multitenancy.md) before adding a feature. Security work still required is listed in the docs and implementation plan.
