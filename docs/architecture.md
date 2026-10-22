# Architecture

Ingredia is a feature first modular monolith. `src/app` contains Next.js routes and UI; `src/features` owns client safe feature contracts, schemas, UI and API clients; `src/server` owns application services, persistence and security. Route handlers translate HTTP to feature calls and shared response helpers. Server modules import `server-only`; client code must never import them.

The App Router follows the installed Next.js version. Server Components are the default. Interactive forms and state belong in Client Components. Public menu pages can become statically rendered once published menu data has a reliable invalidation path. Authenticated dashboards and tenant data are request time data. API Route Handlers are versioned under `/api/v1` and use explicit status and JSON error envelopes.

The ingredients slice demonstrates input contract validation, an application service, a tenant repository, and an isolated tenant SQL adapter. Writes remain 401 until session verification and membership resolution are implemented. Do not pass tenant IDs or schemas from request payloads.

## Boundaries

- `features/*`: client safe types and input schemas, plus future feature UI and client API calls.
- `server/features/*`: server only application services and repositories.
- `server/database/*`: global Prisma access and tenant PostgreSQL access.
- `app/api/v1/*`: HTTP adaptation only.

Avoid importing database drivers, Prisma, or server modules in Client Components. Avoid importing app routes from features.
