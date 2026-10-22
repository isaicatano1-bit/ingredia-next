# Idempotency

Idempotency is planned around the global unique scope `(tenantId, operation, key)`. Store a canonical request hash, in progress/completed state, response status and body, timestamps, and expiry. Claim keys atomically; same key and same payload replays the saved response, same key with a different payload returns conflict, and concurrent requests wait or receive a retryable conflict. Retention cleanup must delete expired rows. This behavior is not implemented yet.
