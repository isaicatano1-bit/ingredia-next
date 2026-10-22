# Implementation plan

1. Implement authentication, cookie/CSRF protections, and membership based tenant resolution.
2. Build a tenant provisioning service and migration runner with version tracking and operational safeguards.
3. Add atomic idempotency storage and Redis backed rate limiting, then test concurrency and cross tenant rejection.
4. Complete ingredient create/list flows with authenticated tenant context and database integration tests.
5. Add the remaining modules as independent features; add published menu rendering after its approval and cache invalidation model is defined.
6. Tune connection pooling, logging/monitoring, secrets, backups, and deployment for the selected Supabase environment.

Market reference prices, restaurant purchase costs, and sale prices remain separate concepts and must use distinct models and flows when those modules are introduced.
