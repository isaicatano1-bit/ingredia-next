# Rate limiting

Production rate limiting must use shared Redis, keyed by action and a trusted identity (account, IP, or tenant). Return `429` and `Retry-After`. Do not use process memory across instances. `RATE_LIMIT_REDIS_URL` is reserved for the adapter; no rate limiter is enabled yet.
