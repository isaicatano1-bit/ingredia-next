# Authentication

Authentication is not implemented yet. The planned session uses a signed JWT in a `Secure`, `HttpOnly`, `SameSite=Lax` cookie, verified on the server with `jose`. Cookie sessions require CSRF protection on state changing requests and short expirations with rotation/revocation strategy. `JWT_SECRET` is server only and must be at least 32 random characters. Registration, password hashing, login throttling, logout, and session verification need implementation and security tests before protected features are enabled.
