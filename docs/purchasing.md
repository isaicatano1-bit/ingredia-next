# Proveedores y compras

Todos estos endpoints requieren sesión autenticada y un tenant autorizado en `x-tenant-id`. Las lecturas requieren membresía; crear, modificar, borrar y confirmar requiere rol `OWNER` o `ADMIN`. Las escrituras también validan origen y limitan solicitudes. No se acepta un nombre de esquema desde el cliente.

## Endpoints

| Método y ruta | Uso |
| --- | --- |
| `GET /api/v1/supplier-ingredients?page=1&limit=25&supplierId=…&ingredientId=…` | Listar relaciones con filtros opcionales |
| `POST /api/v1/supplier-ingredients` | Crear una oferta proveedor ingrediente |
| `GET /api/v1/supplier-ingredients/{id}` | Consultar una oferta |
| `PATCH /api/v1/supplier-ingredients/{id}` | Cambiar referencia, unidad, precio cotizado, mínimo o plazo |
| `DELETE /api/v1/supplier-ingredients/{id}` | Quitar la relación actual |
| `GET /api/v1/purchases?page=1&limit=25&status=DRAFT` | Listar compras paginadas con sus líneas |
| `POST /api/v1/purchases` | Crear un borrador con una o más líneas; requiere `Idempotency-Key` |
| `GET /api/v1/purchases/{id}` | Consultar compra e historial de precios de línea |
| `PATCH /api/v1/purchases/{id}` | Editar encabezado o reemplazar todas las líneas de un borrador |
| `DELETE /api/v1/purchases/{id}` | Eliminar un borrador |
| `POST /api/v1/purchases/{id}/confirm` | Confirmar una compra no vacía y congelar sus datos |

Los precios cotizados y precios históricos deben enviarse como números positivos con hasta cuatro decimales. Las monedas usan códigos de tres letras en mayúscula. El precio cotizado requiere moneda y ambos deben actualizarse juntos. Una compra debe usar, para cada ingrediente, la oferta activa de ese proveedor y su unidad de compra configurada. Así se evita registrar una unidad ajena a la oferta.

## Ciclo de vida e idempotencia

Una compra creada con `POST` queda en `DRAFT`. La misma clave de idempotencia y el mismo cuerpo reproducen la respuesta original durante 24 horas; reutilizar la clave con otro cuerpo devuelve conflicto. Encabezado y líneas se escriben en la transacción tenant, incluyendo el registro compartido de idempotencia. Si una línea falla, se revierte la compra completa.

Un borrador se puede actualizar o eliminar. Para cambiar moneda junto con líneas, el cliente debe enviar las líneas nuevas en el mismo `PATCH`. La confirmación requiere una o más líneas y fija `finalized_at`. PostgreSQL impide editar o borrar compras confirmadas o cambiar líneas una vez confirmado, incluso si una consulta omite la regla del servicio. Una oferta futura no reescribe líneas anteriores.

## Costo y unidades

La política inicial de costo elegible es la compra confirmada más reciente por ingrediente y moneda, siempre que su unidad sea exactamente la unidad de referencia guardada en el ingrediente. Borradores, cancelaciones y cotizaciones no cambian ese costo. Aún no se expone cálculo de costo de receta: no hay una moneda predeterminada por tenant ni factores de conversión. Convertir kg a g requiere un factor explícito aunque ambas unidades sean `MASS`; convertir masa a volumen además puede requerir densidad propia del ingrediente. Las diferencias de moneda requieren una política FX. Hasta agregar esos datos, el servicio de costing debe responder un error de dominio y no estimar un valor.

## Migraciones

`002_restaurant_domain.sql` ya creó las tablas básicas de oferta y compra. `003_supplier_purchasing_lifecycle.sql` añade unidad de compra, mínimos y plazos para oferta, auditoría y fecha de confirmación, y bloqueos de historial. No se ejecutó esta migración contra Supabase. Tras restaurar conectividad y revisar el estado de cada tenant con el proceso operativo, un despliegue controlado llama a `migrateTenantSchema(tenantId)` para tenants existentes; tenants nuevos reciben los archivos en orden mediante provisioning.
