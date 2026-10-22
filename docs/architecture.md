# Arquitectura de Ingredia

## Diagnóstico del repositorio

Ingredia es un monolito modular con Next.js App Router, TypeScript, Route Handlers versionados bajo `/api/v1`, PostgreSQL y Prisma para el esquema global. Los esquemas de cada restaurante son dinámicos y se acceden con `pg` a través de `withTenantClient`.

Antes de organizar las capas, `src/app/page.tsx` y `src/app/layout.tsx` eran la página y el layout de inicio de Next.js. No existen componentes cliente, formularios, hooks ni pantallas de negocio. `src/features` contenía DTOs de ingredientes y esquemas Zod usados directamente por los Route Handlers y por servicios de autenticación. `src/server` contiene sesiones, autorización, configuración, acceso a datos y servicios/repositorios/mappers de dominio. No se encontraron imports desde componentes cliente porque no hay componentes cliente.

Los Route Handlers existentes cubren autenticación (`register`, `login`, `logout`, `me`), tenants y cambio de tenant, salud, unidades, ingredientes, proveedores, relación proveedor-insumo, recetas y compras (incluida confirmación). Los detalles de operaciones, permisos y contratos siguen definidos en los handlers y documentación de API existentes. La página raíz no está conectada a estos endpoints. Por lo tanto, hay backend de esos dominios, pero todavía no una interfaz de negocio integrada.

## Estructura objetivo y responsabilidades

```text
src/
  app/                 Páginas, layouts y Route Handlers HTTP
  components/          Componentes visuales compartidos (cuando existan)
  features/<dominio>/  UI, hooks, clientes HTTP y tipos públicos del frontend
  lib/                 Ayudantes neutrales y cliente HTTP del navegador
  server/
    api/               Errores y respuestas HTTP del servidor
    auth/              Sesiones, autenticación y autorización
    database/          Prisma global, pool tenant y migraciones tenant
    features/<dominio>/schemas/ Validación autoritativa de entrada
    features/<dominio>/         Servicios, repositorios, mappers y tipos del servidor
    security/          Hashing, rate limit y controles de servidor
    tenancy/           Resolución y validación del contexto tenant
```

`components/` y `lib/` no se crean vacíos; aparecerán cuando haya responsabilidades concretas. Los tipos públicos consumidos por el navegador viven en `src/features/<dominio>/types`. La validación autoritativa Zod vive en el servidor. Si en el futuro se requiere validación instantánea de formularios, su esquema debe ser client-safe y no importar módulos del servidor; cualquier regla de negocio sigue validándose en el servidor.

## Reglas de importación

- `src/app` importa Route Handlers desde el servidor; las páginas importan UI/clientes frontend y tipos públicos.
- `src/features` puede importar `src/lib` y tipos públicos de otros features, pero nunca `src/server`, repositorios, Prisma, `pg`, configuración secreta ni rutas de API.
- Los servicios HTTP del frontend solo llaman `/api/v1/...`; incluyen la cookie de sesión del navegador automáticamente y no reciben nombres de esquema tenant.
- `src/server/features` contiene validación autoritativa, reglas de dominio, transacciones, repositorios parametrizados, mappers y tipos internos.
- Cada Route Handler autentica/autoriza según su operación, resuelve el tenant en el servidor y adapta HTTP al servicio de dominio.
- Los nombres de esquema se derivan de datos confiables de servidor y se validan/escapan antes de usarse. Todo acceso tenant continúa pasando por `withTenantClient`.
- No se importan rutas desde features ni se realizan llamadas directas a la base de datos desde el frontend.

## Persistencia y seguridad

Prisma Client administra entidades globales de `public`. Las tablas de restaurantes no forman parte del Prisma schema porque cada tenant tiene un esquema PostgreSQL distinto. Sus repositorios usan `pg` con parámetros; `withTenantClient` verifica el par de tenant y esquema, abre la transacción y configura `search_path` local a esa transacción. Esta separación permite que las operaciones de compras coordinen las filas tenant y la idempotencia en la misma conexión PostgreSQL.

Se preservan las cookies `httpOnly`, la autorización por membresía/rol, las transacciones, la idempotencia, el rate limit compartido, el ciclo de vida de compras y las migraciones existentes. El frontend solo conoce el UUID público del tenant cuando el endpoint lo necesita; nunca el nombre del esquema.

## Estado de frontend por dominio

| Dominio | API de servidor | UI conectada |
|---|---|---|
| Autenticación | Registro, login, logout y usuario actual | No |
| Unidades | CRUD | No |
| Ingredientes | CRUD | No |
| Proveedores | CRUD | No |
| Proveedor-insumo | CRUD | No |
| Recetas | CRUD | No |
| Compras | Borradores, líneas, listado y confirmación | No |

Los clientes HTTP proporcionan una base tipada para integrar pantallas futuras; no equivalen a una interfaz ya implementada.

## Verificaciones de cambios

Tras cualquier movimiento de código, comprobar referencias con `rg`, ejecutar `npx tsc --noEmit`, `npm run lint`, `npm test -- --reporter=dot` y `npm run build`. `npx prisma validate` verifica solo el schema global; las comprobaciones de la base remota requieren conectividad y no forman parte de una reorganización frontend/backend. Nunca ejecutar migraciones de Supabase como parte de este trabajo.
