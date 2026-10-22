# API rate limiting

The current adapter uses a PostgreSQL fixed window stored in `public.rate_limit_buckets`, so counters are shared across server instances. The `0003_rate_limits` migration must be deployed before these endpoints are available. Keys are SHA-256 hashes of an action and the applicable account/tenant identity; raw email values are not stored in the limiter table. Expired buckets are deleted opportunistically.

Defaults: login allows 8 attempts per normalized email in 15 minutes; registration and tenant creation allow 5 per identity per hour; resource creation has per-member/per-tenant per-minute limits (ingredients 30, suppliers 20, recipes 15). A rejected request returns `429` and `Retry-After`. If the database limiter cannot be reached, production requests fail closed rather than falling back to per-process memory.

Counters are currently configured as constants in route handlers; `RATE_LIMIT_REDIS_URL` is retained in the environment template for a future shared Redis adapter and is not used by this implementation.
