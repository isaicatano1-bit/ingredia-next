# Auditoría del backend Ingredia

Revisión realizada el 22 de octubre de 2026. Clasifico como **verificado** solo lo cubierto por un comando o test ejecutado. La disponibilidad de la conexión se evalúa separada de la existencia del código.

## Estado factual

| Área | Estado | Evidencia y límite |
| --- | --- | --- |
| Registro y login | Implementado pero no probado de extremo a extremo | `src/app/api/v1/auth/{register,login}/route.ts`, `src/server/auth/auth-service.ts`. Normaliza email, bcrypt work factor 12 y respuesta de login genérica; no hay test de rutas con Prisma real. |
| Hash/verify de contraseña | Implementado y verificado | `src/server/security/password.ts`; `tests/unit/password.test.ts` comprueba hash y comparación correcta/incorrecta. |
| Firma, claims y caducidad JWT | Implementado y verificado a nivel unitario | `src/server/auth/session.ts`; `tests/security/session.test.ts` verifica issuer, audience, subject, jti y expiry. |
| Cookie y logout | Implementado; verificación de persistencia pendiente | Cookie HttpOnly, SameSite=Lax, Secure en producción y atributos coincidentes al borrar. Logout registra `jti` revocado y el lector lo rechaza. Test con Prisma simulado; falta comprobar la tabla en PostgreSQL. |
| CSRF / origen | Parcialmente implementado | Las escrituras requieren `Origin`; en producción `APP_BASE_URL` y HTTPS se comprueban al usar auth/origen. El fallback local compara contra el origin de la solicitud. Falta test de rutas para origen permitido/rechazado y revisar los proxies usados en despliegue. |
| Tenant resolver, membresía y roles | Implementado pero no probado con DB | `src/server/auth/authorization.ts`; las rutas tenant usan `resolveTenant` y los roles OWNER/ADMIN se exigen para escrituras. No existe prueba de API con un usuario real y dos tenants. |
| Cambio de tenant | Parcialmente implementado | `src/app/api/v1/tenants/switch/route.ts` valida membership y devuelve la selección. No cambia estado de sesión; el cliente debe enviar `x-tenant-id` en cada llamada. |
| Nombre de esquema / SQL tenant | Implementado y verificado en lógica pura | `src/server/tenancy/tenant-context.ts`, `src/server/database/tenant-pool.ts`; nombre derivado del UUID, regex estricta, comillas y `SET LOCAL` dentro de transacción. `tests/unit/tenant-context.test.ts` pasa. No se probó el aislamiento desde el runtime contra PostgreSQL. |
| Modelos globales / Prisma | Implementados y verificados estáticamente | `prisma/schema.prisma`; `npx prisma validate` y `npx prisma generate` pasaron con Prisma 6.19.3. |
| Historial global de migraciones | Implementado; estado remoto bloqueado | `prisma/migrations/0001_global` a `0004_revoked_sessions`. `npx prisma migrate status` alcanzó el pooler Supabase pero el motor devolvió `Schema engine error` sin detalle; no se afirma que 0003 o 0004 estén aplicadas. |
| SQL por tenant / constraints | Implementado, parte probado | `prisma/tenant-migrations/001_ingredients.sql` y `002_restaurant_domain.sql` definen unidades, ingredientes, proveedores, compras, recetas, menú y propuestas, con checks, FKs, índices y `RESTRICT`. Los tests de migración/constraint existen pero los 4 casos se omitieron al faltar DB de pruebas. |
| Provisioning y migraciones tenant futuras | Implementado; DB no disponible | `src/server/database/tenant-provisioning.ts` crea tenant/membership/esquema y aplica migraciones con checksum y advisory lock en una transacción. Tests cubren retry/concurrencia, migración futura e aislamiento en código, pero no se ejecutaron en esta sesión. |
| Unidades | Implementado; requiere prueba DB | `src/app/api/v1/units/` y `src/server/features/units/unit-repository.ts` permiten listar, crear, editar nombre/abreviatura y borrar sujeto a FK restrict. Test de schema pasa. Los tipos de medida son inmutables desde PATCH para no reinterpretar historial. |
| Ingredientes | Implementado pero no probado con DB | `src/app/api/v1/ingredients/` ofrece GET/POST/PATCH/DELETE (archivado), búsqueda, paginación, referencia a unidad tenant-local e idempotencia en POST. Solo se probó rechazo de una petición anónima; sin CRUD/aislamiento con DB. |
| Proveedores | Implementado pero no probado con DB | `src/app/api/v1/suppliers/` tiene CRUD y archivado, pero no endpoints para `supplier_ingredients` ni validación de duplicados de esa relación. |
| Recetas | Parcialmente implementado | `src/app/api/v1/recipes/` tiene CRUD, `PUT` reemplaza ingredientes transaccionalmente y valida referencias/cantidades. No valida compatibilidad física/conversión de unidades, no implementa costing y no tiene idempotencia en creación. |
| Compras y líneas | Faltante en API | Tablas `purchases` y `purchase_lines` existen en SQL con precios históricos y restricciones, pero no hay Route Handlers ni servicios. |
| Menú y propuestas de precio | Faltante en API | `menu_items` y `price_proposals` existen en SQL; faltan endpoints y reglas de autorización/estado. |
| Idempotencia | Implementada; DB pendiente | Ingredientes y proveedores guardan hash, status y body en transacción y serializan por advisory lock. Provisioning usa tabla owner/key. Concurrencia de estas rutas no tiene test ejecutado. |
| Rate limit | Implementado; migración pendiente de confirmación | `src/server/security/rate-limit.ts` usa ventanas fijas en PostgreSQL compartido y responde 429 con `Retry-After`. `0003_rate_limits` crea la tabla; sin `migrate status` exitoso no se sabe si existe en Supabase. |
| Errores y logging | Parcialmente implementado | `src/server/api/responses/json.ts` oculta errores inesperados y genera request ID; mapea errores Prisma/PostgreSQL comunes. El log contiene ID/evento, pero no hay integración de observabilidad ni tests de mapeos. |
| Variables y secretos | Parcialmente implementado | `src/server/config/env.ts` valida forma; JWT_SECRET se exige al usar sesión y producción exige APP_BASE_URL HTTPS. Faltan pruebas de configuración de producción y rotación/gestión de secretos del despliegue. No encontré usos `NEXT_PUBLIC_*` de secretos en las rutas inspeccionadas. |
| TypeScript y ESLint | Implementado y verificado | `npx tsc --noEmit` y `npm run lint` terminaron con código 0. |
| Tests | Parcialmente implementados | `npm test`: 21 pasaron y 4 de integración PostgreSQL se omitieron. Falta cobertura para rutas auth exitosas, roles, aislamiento por repositorio, FK desde endpoints, idempotencia concurrente y límites 429. |
| Build de producción | Bloqueado por red del entorno | `npm run build` falla porque `next/font/google` no consigue descargar Geist/Geist Mono de `fonts.googleapis.com`, no por un error reportado de TypeScript. |
| Docker y CI | Parcialmente implementados | Existen `Dockerfile`, `docker-compose.yml` y `.github/workflows/ci.yml`. Docker build llama a `next build`; CI no arranca PostgreSQL, no aplica migraciones ni corre integración. La build CI también depende de Google Fonts. |
| Documentación | Parcialmente implementada | README y docs cubren auth, multitenancy, migraciones y rate limit; `docs/architecture.md` aún conserva texto obsoleto que dice que ingredientes rechaza escrituras. Falta OpenAPI y despliegue de migraciones por tenant automatizado con control operativo. |

## Próximas prioridades

1. **Seguridad y aislamiento:** desplegar y verificar 0003/0004 en staging; ejecutar tests auth y autorización con DB aislada; confirmar que el runtime usa un rol PostgreSQL sin permisos globales innecesarios. Probar CSRF detrás del proxy real.
2. **Base y provisioning:** ejecutar migraciones en DB de prueba, verificar status y repetir provisioning/concurrencia. Añadir prueba de revocación JWT en PostgreSQL y validar recuperación operativa de errores.
3. **Completar módulos:** implementar SupplierIngredient, Purchase/PurchaseLine, MenuItem y PriceProposal. Definir conversiones y política de costing antes de publicar costos.
4. **Confiabilidad:** probar 429/Retry-After e idempotencia concurrente de rutas. Añadir límites/filtros de paginación y transacciones donde correspondan.
5. **Entrega:** self-host de fuentes o eliminar dependencia de red del build; actualizar arquitectura/OpenAPI y ampliar CI para migraciones y PostgreSQL efímero. Revisar alertas de vulnerabilidad del árbol npm antes de desplegar.

## Comandos ejecutados en la auditoría

- Correctos: `npx prisma format`, `npx prisma generate`, `npx prisma validate`, `npx tsc --noEmit`, `npm run lint`, `npm test`.
- `npm test`: 21 passed, 4 skipped.
- Bloqueado: `npx prisma migrate status` (error del motor contra el pooler Supabase, sin detalle); no se aplicó ninguna migración.
- Bloqueado: `npm run build` (descarga de Google Fonts no disponible).
