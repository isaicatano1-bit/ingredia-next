# Authentication

The API issues a one-hour HS256 JWT using `jose`, with issuer `ingredia`, audience `ingredia-api`, subject, issued-at, expiry, and token ID claims. It is stored in an HttpOnly, SameSite=Lax cookie (`__Host-ingredia_session` in production; `ingredia_session` over local HTTP). Production cookies are Secure. Logout expires the cookie; it does not revoke an already copied token, so there is no refresh or server-side revocation mechanism yet.

State-changing browser endpoints require `Origin` to match `APP_BASE_URL` (or the request origin in local development). `JWT_SECRET` is server-only and must be at least 32 random characters. Password hashes use bcryptjs with work factor 12; inputs are limited to 72 UTF-8 bytes. Login throttling uses the shared PostgreSQL rate-limit table and becomes active after migrations are deployed. Do not expose token values in JSON or client storage.
