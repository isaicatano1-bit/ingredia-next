# Multitenancy

`public.tenants` maps an opaque tenant UUID to a generated schema name. Provision names server side from random UUID bytes (`tenant_` plus 32 lowercase hexadecimal digits), never from user supplied slugs. Create schemas and apply versioned migrations only from a privileged provisioning/migration process. Runtime roles should have access only to approved schemas where possible.

After authentication, resolve the active membership from the global store. Authorization must verify that membership on every request and produce a `TenantContext`; request tenant IDs are only selectors that must be checked against that membership. The ingredient route intentionally does not write until this resolver exists. Never use client schema names. Schema switching uses validated identifiers and a transaction-local search path; all row values are bound parameters.
