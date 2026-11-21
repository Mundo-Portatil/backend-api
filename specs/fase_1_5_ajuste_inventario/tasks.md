# Tareas de Implementación — Fase 1.5: Inventario Unificado Sincronizado y Rol Encargado de Almacén

## Fase 1.5.1: Modelo de Datos y Schema Prisma
- [x] **T1.5.1.1: Actualización de `prisma/schema.prisma`**
  - Agregar `ENCARGADO_ALMACEN` en `enum Role`.
  - Eliminar la columna `name String` en `model ProductCatalog`.
  - Mantener `HardwareItem.parentChassisId` (nullable) y `QuantityStock` para asegurar compatibilidad referencial.
- [x] **T1.5.1.2: Sincronización y Generación de Cliente Prisma**
  - Ejecutar `npx prisma validate` para verificar la sintaxis del esquema.
  - Ejecutar `npx prisma db push --accept-data-loss` contra Supabase.
  - Ejecutar `npx prisma generate` (respetando la versión Prisma Client v5.22.0).

---

## Fase 1.5.2: Refactorización de `CatalogModule` (`src/modules/catalog/`)
- [x] **T1.5.2.1: Capa de Dominio**
  - Eliminar `name` en la entidad pura `CatalogItemEntity` (constructor, factory `create` y método `updateDetails`).
  - Actualizar el contrato `CatalogRepositoryPort` eliminando referencias a `name`.
- [x] **T1.5.2.2: Capa de Aplicación**
  - Actualizar DTOs puros: `create-catalog-item-command.dto.ts`, `update-catalog-item-command.dto.ts`, `catalog-item-response.dto.ts`, `catalog-detail-response.dto.ts` y `create-pass-through-catalog-model-command.dto.ts`.
  - Actualizar `CreateCatalogItemUseCase`: eliminar `name` y auto-generar `sku` con formato `MP-CAT-XXXXXX` si viene omitido; si se envía, validar unicidad (`409 Conflict`).
  - Actualizar `UpdateCatalogItemUseCase`: eliminar asignación y validación de `name`.
  - Actualizar `GetCatalogItemsUseCase`: remover `name` y mapear `brand` y `model`.
  - Actualizar `GetCatalogItemDetailUseCase`: obtener el stock físico disponible por ubicación exclusivamente desde `QuantityStock`.
  - Actualizar `CreatePassThroughCatalogModelUseCase`: construir ficha de catálogo sin `name`.
- [x] **T1.5.2.3: Capa de Infraestructura**
  - Actualizar `catalog.mapper.ts`: remover `name` en `toDomain` y `toPersistence`.
  - Actualizar `prisma-catalog.repository.ts`:
    - Eliminar `name` de consultas de creación y actualización.
    - Actualizar búsqueda multi-campo a `sku`, `brand`, `model` y `processor`.
    - Actualizar `findDetailWithStockSummary` para consolidar existencias únicamente desde `QuantityStock`.
  - Actualizar DTOs HTTP Swagger: `create-catalog-item.http-dto.ts` (remover `name`, hacer `sku` opcional), `update-catalog-item.http-dto.ts` y `query-catalog.http-dto.ts`.
  - Actualizar `catalog.controller.ts`:
    - `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)` en `POST /catalog` y `PATCH /catalog/:id`.
    - `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)` en `GET /catalog` y `GET /catalog/:id`.

---

## Fase 1.5.3: Limpieza y Ajustes en `HardwareItemsModule` (`src/modules/hardware-items/`)
- [x] **T1.5.3.1: Eliminación de Jerarquía Padre-Hijo en Controladores y Casos de Uso**
  - Remover DTOs: `attach-child-command.dto.ts` y `attach-child.http-dto.ts`.
  - Remover casos de uso: `AttachHardwareChildUseCase` y `DetachHardwareChildUseCase`.
  - Remover rutas HTTP `POST /hardware-items/:id/children` y `DELETE /hardware-items/:id/children/:childId` de `hardware-items.controller.ts`.
  - Limpiar exports y providers en `hardware-items.module.ts`.
- [x] **T1.5.3.2: Implementación de Consulta de Series Disponibles (`GET /hardware-items/available-serials`)**
  - Crear DTO de respuesta `available-serial-response.dto.ts` (`id`, `serialNumber`, `salePrice`, `createdAt`).
  - Crear caso de uso `GetAvailableSerialsUseCase` filtrando por `catalogId` y `locationId` (resolviendo por defecto la ubicación `ALMACEN_CENTRAL`).
  - Crear endpoint en `hardware-items.controller.ts`: `GET /hardware-items/available-serials` con roles `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` (declarado antes de `GET /hardware-items/:id`).
- [x] **T1.5.3.3: Sincronización Transaccional en Baja Lógica (`PATCH /hardware-items/:id/decommission`)**
  - Inyectar `TRANSACTION_MANAGER_PORT` y `QUANTITY_STOCK_REPOSITORY` en `DecommissionHardwareItemUseCase`.
  - Al pasar un ítem de `EN_STOCK` a `DE_BAJA`, decrementar en `1` la cantidad en `QuantityStock` para `(item.catalogId, item.locationId)` en la misma transacción (`tx`).
- [x] **T1.5.3.4: Sincronización Transaccional en Aprobación de Segunda Mano (`POST /hardware-items/approve-used`)**
  - Inyectar `QUANTITY_STOCK_REPOSITORY` y `TRANSACTION_MANAGER_PORT` en `ApproveUsedComponentUseCase`.
  - Al pasar ítem a `EN_STOCK`, incrementar en `1` la cantidad en `QuantityStock` para `(usedCatalogId, locationId)` en la misma transacción (`tx`).
  - Eliminar asignación de `name` al crear la variante de catálogo `-USED`.
- [x] **T1.5.3.5: Actualización de Títulos de Etiquetas Térmicas 1D**
  - Actualizar `GetBarcodeLabelUseCase` y `GetBatchBarcodeLabelsUseCase` para generar `title` como `${catalogItem.brand} ${catalogItem.model}`.
- [x] **T1.5.3.6: Actualización de RBAC en `HardwareItemsController`**
  - Permitir a `ENCARGADO_ALMACEN` en `POST /hardware-items/validate-serials`, `POST /hardware-items/approve-used`, `POST /hardware-items`, `PATCH /hardware-items/:id`, `PATCH /hardware-items/:id/decommission` y todas las consultas/impresiones `GET`.

---

## Fase 1.5.4: Ajustes en `QuantityStockModule` (`src/modules/quantity-stock/`)
- [x] **T1.5.4.1: Protección de Integridad en Ajuste Manual (`PATCH /quantity-stock/adjust`)**
  - Inyectar `HARDWARE_ITEM_REPOSITORY` en `AdjustQuantityStockUseCase`.
  - Validar si existen ítems en `HardwareItem` con `status === 'EN_STOCK'` para `(catalogId, locationId)`.
  - Si existen series activas, rechazar con `400 Bad Request` indicando que el ajuste debe realizarse mediante las series individuales.
- [x] **T1.5.4.2: Actualización de Respuestas y Mapeos sin `catalog.name`**
  - Actualizar `QuantityStockResponseDto` y `prisma-quantity-stock.repository.ts` para representar el catálogo con `brand` y `model`.
- [x] **T1.5.4.3: Actualización de RBAC en `QuantityStockController`**
  - Permitir `ENCARGADO_ALMACEN` en `POST /quantity-stock/inbound`, `PATCH /quantity-stock/adjust` y `GET /quantity-stock`.

---

## Fase 1.5.5: Implementación de `InventoryModule` (`src/modules/inventory/`)
- [x] **T1.5.5.1: DTOs de Aplicación e Infraestructura**
  - Crear `unified-inbound-command.dto.ts` y `unified-inbound-response.dto.ts`.
  - Crear `print-model-barcode-labels-command.dto.ts` y `model-barcode-label-response.dto.ts`.
  - Crear DTOs HTTP Swagger con validadores `class-validator`: `unified-inbound.http-dto.ts` y `print-model-barcode-labels.http-dto.ts`.
- [x] **T1.5.5.2: Caso de Uso de Ingreso Unificado (`UnifiedInventoryInboundUseCase`)**
  - Resolver automáticamente la ubicación activa de tipo `ALMACEN_CENTRAL`.
  - Ejecutar en una transacción con `TransactionManagerPort`:
    - Actualizar `QuantityStock` para cada modelo (incrementando `quantity`, actualizando precios).
    - Si `hasSerialNumbers === true`: validar `serialNumbers.length === quantity`, validar unicidad y crear registros en `HardwareItem` con `parentChassisId: null`.
  - Registrar evento `UNIFIED_INVENTORY_INBOUND` en `AuditLogPort`.
- [x] **T1.5.5.3: Caso de Uso de Impresión por Modelo (`PrintModelBarcodeLabelsUseCase`)**
  - Consultar modelo de catálogo y ubicación (o Almacén Central).
  - Generar arreglo con `copies` etiquetas idénticas usando `catalog.sku` como `barcodeValue`, `${catalog.brand} ${catalog.model}` como `title`, especificaciones técnicas y precio.
  - Registrar evento `PRINT_MODEL_BARCODE_LABELS` en `AuditLogPort`.
- [x] **T1.5.5.4: Controlador y Ensamblado de `InventoryModule`**
  - Crear `inventory.controller.ts`:
    - `POST /inventory/inbound` (`ADMIN`, `ENCARGADO_ALMACEN`).
    - `POST /inventory/barcode-labels/by-model` (`ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO`).
  - Crear `inventory.module.ts` importando `CatalogModule`, `LocationsModule`, `HardwareItemsModule` y `QuantityStockModule`.
  - Registrar `InventoryModule` en `src/app.module.ts`.

---

## Fase 1.5.6: Actualización de RBAC en `CategoriesModule`, `LocationsModule` y `UsersModule`
- [x] **T1.5.6.1: `CategoriesController`**
  - Agregar `ENCARGADO_ALMACEN` a `@Roles` en `POST /categories`, `PATCH /categories/:id` y `GET /categories`.
- [x] **T1.5.6.2: `LocationsController`**
  - Agregar `ENCARGADO_ALMACEN` a `@Roles` en `GET /locations`.
- [x] **T1.5.6.3: `UsersModule`**
  - Verificar que la creación y consulta de usuarios reconozca `Role.ENCARGADO_ALMACEN`.
  - Agregar `ENCARGADO_ALMACEN` a `@Roles` en `PATCH /users/me`.

---

## Fase 1.5.7: Integración Global, Verificación y Contratos de API
- [x] **T1.5.7.1: Verificación de Pureza y Compilación Estricta**
  - Ejecutar verificación de pureza (cero imports de `@prisma/client`, `@nestjs/swagger` o decoradores en `domain/` y `application/`).
  - Ejecutar `npm run build` y asegurar **0 errores** de TypeScript.
- [x] **T1.5.7.2: Actualización de `specs/API_CONTRACTS.md`**
  - Documentar `POST /inventory/inbound` con ejemplos JSON detallados para lotes mixtos con y sin series.
  - Documentar `POST /inventory/barcode-labels/by-model`.
  - Documentar `GET /hardware-items/available-serials`.
  - Actualizar los contratos de `CatalogModule` eliminando el campo `name`.
  - Remover de los contratos los endpoints Padre-Hijo eliminados (`POST /hardware-items/:id/children`, `DELETE /hardware-items/:id/children/:childId`).
  - Actualizar tabla resumen de endpoints con los roles permitidos y el nuevo rol `ENCARGADO_ALMACEN`.
