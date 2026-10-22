# Idempotency

Ingredient and supplier creation store idempotency rows in `public`, uniquely scoped by `(tenantId, operation, key)`. The service takes a transaction-scoped advisory lock, compares the SHA-256 hash of the validated/normalized request body, and commits both the resource and original response in one PostgreSQL transaction. Matching retries replay the saved response; different content with the same key returns `409`.

Uncommitted work and its idempotency row roll back together, so a process crash does not leave a committed in-progress claim. Records expire after 24 hours and an expired key may be reused. Tenant provisioning has a separate owner/key table and is server-minted. Registration is not tenant-scoped and does not use the tenant idempotency table.
