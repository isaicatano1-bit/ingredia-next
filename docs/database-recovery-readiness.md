# Informe de conectividad y preparación de migraciones

Fecha: 22 de octubre de 2026. La inspección fue de solo lectura. No se ejecutó ningún comando de migración ni SQL de escritura, y no se imprimieron credenciales.

## Hechos confirmados localmente

- `prisma` CLI instalado: **6.19.3**; `@prisma/client` instalado: **6.19.3**. Los rangos del package manifiestan `^6.19.3`. `prisma/schema.prisma` declara PostgreSQL, `DATABASE_URL` para runtime y `DIRECT_URL` para Prisma Migrate; los modelos visibles están en `public`.
- El entorno usa Node **v26.0.0**. Prisma ORM 6 documenta soporte para sus líneas Node 18, 20 y 22 (el upgrade guide de v6 especifica mínimos de 18.18, 20.9 y 22.11). Node 26 no figura en la lista soportada para Prisma 6. El Dockerfile usa Node 22. Alpine tiene dependencias nativas de Prisma que deben quedar presentes en la imagen final. [Requisitos oficiales de Prisma ORM](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v6).
- `npx prisma validate` confirma el schema local. `npx prisma migrate status` carga el schema pero falla con `Schema engine error` vacío.
- `DATABASE_URL` y `DIRECT_URL` apuntan al mismo host, puerto y base de datos; el host termina en `pooler.supabase.com`, puerto 5432. Por patrón es Supavisor en modo sesión, no conexión directa ni pooler de transacción (6543). La base indicada es `postgres`; ambas URL no tienen parámetros de query. No se imprimieron ni compararon en el informe el usuario, la contraseña ni los valores de credenciales.
- `TENANT_PROVISIONING_DATABASE_URL` no está configurada en el entorno local examinado; el servicio de provisioning usa `DIRECT_URL` como fallback. `.env.example` sí la documenta como opción.
- Las pruebas DNS fallaron con `ENOTFOUND` tanto para el hostname configurado como para `example.com`. El driver `pg` falló contra ambas URLs con `ENOTFOUND` para el hostname de Supabase. Esto confirma que **este entorno de ejecución no pudo resolver nombres DNS** durante la auditoría; por tanto, no alcanzó TCP, TLS ni PostgreSQL.

## Estado del servidor remoto: desconocido

No se pudieron leer `server_version`, `public._prisma_migrations`, las tablas existentes ni sus columnas/índices. Tampoco fue posible comparar checksums locales con la historia remota. El error de Prisma es consistente con la falla de DNS observada, pero no se puede demostrar que sea su única causa: la conexión, credenciales, TLS y permisos del servidor no llegaron a verificarse.

Los nombres `rate_limit_buckets` y `revoked_sessions` no aparecen creados en `0001_global` ni `0002_global_integrity`; sus migraciones locales son `0003_rate_limits` y `0004_revoked_sessions`. Ambas usan `CREATE TABLE` sin `IF NOT EXISTS`. No se detecta conflicto entre los propios archivos locales y el schema Prisma. **No se puede afirmar que esos objetos no existan en Supabase**: otra migración, operación manual o despliegue separado podría haberlos creado.

La historia local contiene:

| Migración | Efecto local esperado | Estado remoto |
| --- | --- | --- |
| `0001_global` | Crea usuarios, tenants, memberships e idempotency records | Desconocido |
| `0002_global_integrity` | Añade roles enum, checks, FK y provisioning requests | Desconocido |
| `0003_rate_limits` | Crea `public.rate_limit_buckets` | Desconocido |
| `0004_revoked_sessions` | Crea `public.revoked_sessions` | Desconocido |

## Preparación segura

**No ejecutar todavía** `prisma migrate deploy`: la historia remota y los objetos con los nombres que crean 0003/0004 no pudieron inspeccionarse. Tampoco editar, borrar ni marcar migraciones como aplicadas.

Desde una máquina con DNS y salida PostgreSQL habilitados, usando el mismo entorno y secretos sin imprimirlos:

1. Confirmar que DATABASE_URL apunta al pooler de sesión para runtime y que DIRECT_URL usa la conexión recomendada para migraciones. Si se mantiene Supavisor, seguir los parámetros TLS requeridos por el proyecto Supabase. Confirmar que el nombre de usuario del pooler corresponde al project ref correcto sin compartirlo en logs.
2. Ejecutar `npx prisma migrate status` y guardar su salida redactada. Consultar en una transacción `READ ONLY` `server_version`, `public._prisma_migrations` (nombre, checksum, finished_at, rolled_back_at) y existencia/columnas/constraints/índices de las tablas globales y de `rate_limit_buckets`/`revoked_sessions`.
3. Comparar cada entrada remota con los SQL/checksums de los cuatro directorios locales. Investigar migraciones fallidas, sin terminar, remotas desconocidas o tablas existentes sin registro antes de decidir cualquier cambio.
4. Si la historia está consistente y 0003/0004 no existen sin registrar, respaldar la base y aplicar el despliegue aprobado desde staging con `npx prisma migrate deploy`; luego volver a consultar status y las dos tablas. Solo después planear producción.

Comandos locales de comprobación estática ya ejecutados: `npx prisma validate` pasó; CLI y Client son exactamente 6.19.3. No se ejecutaron `migrate deploy`, `migrate dev`, `db push`, reset, DDL ni DML.
