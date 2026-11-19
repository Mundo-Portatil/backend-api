# Tareas de Implementación — Fase 1: Categorías, Catálogo Maestro, Lotes, Inventario (Serializado/Cantidad) y Trazabilidad

## Fase 1.1: Alineación de Base de Datos y Schema Prisma
- [x] **T1.1.1: Actualización de `prisma/schema.prisma`**
  - Agregar `active Boolean @default(true)` en `model ProductCatalog` para dar soporte al borrado lógico exigido por la constitución.
  - Agregar `@@unique([catalogId, locationId])` en `model QuantityStock` para control de stock único por producto y puesto/almacén.
  - Ejecutar `npx prisma validate` para verificar la integridad sintáctica del esquema.
- [x] **T1.1.2: Sincronización y Generación de Cliente Prisma**
  - Ejecutar `npx prisma db push` para aplicar los cambios en la base de datos de Supabase sin romper datos existentes.
  - Ejecutar `npx prisma generate` manteniendo Prisma Client en la versión fija `5.22.0`.

---

## Fase 1.2: Módulo de Categorías Dinámicas (`src/modules/categories/`)
- [x] **T1.2.1: Capa de Dominio**
  - Crear entidad pura `src/modules/categories/domain/entities/category.entity.ts` con invariantes y método `deactivate()`.
  - Crear puerto `src/modules/categories/domain/ports/out/category-repository.port.ts` y exportar `CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY')`.
- [x] **T1.2.2: Capa de Aplicación**
  - Crear DTOs puros de aplicación: `create-category-command.dto.ts`, `update-category-command.dto.ts`, `category-response.dto.ts`.
  - Crear `CreateCategoryUseCase` (validación de unicidad case-insensitive, guardado y registro `CREATE_CATEGORY` en `AuditLogPort`).
  - Crear `GetCategoriesUseCase` (soporte de filtro `?active=true` y conteo de productos asociados).
  - Crear `UpdateCategoryUseCase` (validación de existencia, unicidad en cambio de nombre y registro `UPDATE_CATEGORY`).
- [x] **T1.2.3: Capa de Infraestructura**
  - Crear `category.mapper.ts` (mapeo `ComponentCategory` $\leftrightarrow$ `CategoryEntity`).
  - Crear `prisma-category.repository.ts` implementando `CategoryRepositoryPort`.
  - Crear DTOs HTTP con Swagger y `class-validator`: `create-category.http-dto.ts` y `update-category.http-dto.ts`.
  - Crear `categories.controller.ts` con endpoints:
    - `POST /categories` (`ADMIN`)
    - `GET /categories` (`ADMIN`, `VENDEDOR`, `TECNICO`)
    - `PATCH /categories/:id` (`ADMIN`) con `new ParseUUIDPipe({ version: '4' })`.
- [x] **T1.2.4: Ensamblado del Módulo**
  - Crear `categories.module.ts` configurando providers con `CATEGORY_REPOSITORY`.
  - Exportar `CATEGORY_REPOSITORY`, `CreateCategoryUseCase` y `GetCategoriesUseCase`.
  - Registrar `CategoriesModule` en `src/app.module.ts`.

---

## Fase 1.3: Módulo de Catálogo Maestro (`src/modules/catalog/`)
- [x] **T1.3.1: Capa de Dominio**
  - Crear entidad pura `src/modules/catalog/domain/entities/catalog-item.entity.ts` con reglas de validación de ficha técnica y precios.
  - Crear puerto `src/modules/catalog/domain/ports/out/catalog-repository.port.ts` y exportar `CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY')`.
- [x] **T1.3.2: Capa de Aplicación**
  - Crear DTOs puros: `create-catalog-item-command.dto.ts`, `update-catalog-item-command.dto.ts`, `create-pass-through-catalog-model-command.dto.ts`, `catalog-item-response.dto.ts`, `catalog-detail-response.dto.ts`.
  - Crear `CreateCatalogItemUseCase` (valida categoría existente y activa mediante `CATEGORY_REPOSITORY`, valida SKU único, persiste y registra `CREATE_CATALOG_ITEM`).
  - Crear `GetCatalogItemsUseCase` (paginación, filtros por `categoryId`, `active` y búsqueda `search` multi-campo).
  - Crear `GetCatalogItemDetailUseCase` (consulta producto maestro y consolida resumen de stock físico disponible desglosado por cada ubicación).
  - Crear `UpdateCatalogItemUseCase` (edición de especificaciones, precios referenciales o estado activo, emite `UPDATE_CATALOG_ITEM`).
  - Crear `CreatePassThroughCatalogModelUseCase` (**Exportable para M5**): Crea modelo en catálogo para pase con stock inicial en 0.
- [x] **T1.3.3: Capa de Infraestructura**
  - Crear `catalog.mapper.ts` (mapeo `ProductCatalog` $\leftrightarrow$ `CatalogItemEntity`).
  - Crear `prisma-catalog.repository.ts` implementando `CatalogRepositoryPort` con agregación de stock por ubicación.
  - Crear DTOs HTTP Swagger: `create-catalog-item.http-dto.ts`, `update-catalog-item.http-dto.ts`, `query-catalog.http-dto.ts`.
  - Crear `catalog.controller.ts` con:
    - `POST /catalog` (`ADMIN`)
    - `GET /catalog` (`ADMIN`, `VENDEDOR`, `TECNICO`)
    - `GET /catalog/:id` (`ADMIN`, `VENDEDOR`, `TECNICO`) con `ParseUUIDPipe`
    - `PATCH /catalog/:id` (`ADMIN`) con `ParseUUIDPipe`
- [x] **T1.3.4: Ensamblado del Módulo**
  - Crear `catalog.module.ts` importando `CategoriesModule`.
  - Exportar `CATALOG_REPOSITORY`, `CreatePassThroughCatalogModelUseCase`, `GetCatalogItemDetailUseCase`.
  - Registrar `CatalogModule` en `src/app.module.ts`.

---

## Fase 1.4: Módulo de Inventario Serializado y Lotes (`src/modules/hardware-items/`)
- [x] **T1.4.1: Capa de Dominio**
  - Crear entidad pura `src/modules/hardware-items/domain/entities/hardware-item.entity.ts` con invariantes padre-hijo (`attachChild`, `detachChild`) y anulación (`decommission`).
  - Crear value object `src/modules/hardware-items/domain/value-objects/barcode-label.vo.ts` para datos de etiquetas 1D Code 128.
  - Crear puertos de salida:
    - `hardware-item-repository.port.ts` y exportar `HARDWARE_ITEM_REPOSITORY = Symbol('HARDWARE_ITEM_REPOSITORY')`.
    - `serial-generator.port.ts` y exportar `SERIAL_GENERATOR_PORT = Symbol('SERIAL_GENERATOR_PORT')`.
- [x] **T1.4.2: Capa de Aplicación**
  - Crear DTOs puros de comandos y respuestas para batch-inbound, single item, validate-serials, decomission y lifecycle.
  - Crear `BatchInboundHardwareUseCase` (orquestación transaccional con `TransactionManagerPort`, alta múltiple de laptops y componentes hijos anidados, generación de series internas `MP-...`, persistencia y emisión de `BATCH_INBOUND_HARDWARE`).
  - Crear `CreateHardwareItemUseCase` (alta individual, validación de serie única y registro `CREATE_HARDWARE_ITEM`).
  - Crear `ValidateSerialsUseCase` (consulta en masa de seriales existentes para pistoleo dinámico).
  - Crear `GetHardwareItemsUseCase` (filtros por `locationId`, `categoryId`, `catalogItemId`, `status`, `condition`, `search`, `onlyParents=true`).
  - Crear `ScanHardwareItemUseCase` (**Scanner-First**): búsqueda por serial/código de barras, resolución de ubicación y jerarquía padre-hijo.
  - Crear `GetHardwareItemDetailUseCase` (detalle completo con relaciones cargadas).
  - Crear `GetHardwareLifecycleUseCase` (**Hoja de Vida M6**): consolidación cronológica de eventos de auditoría y movimientos.
  - Crear `GetBarcodeLabelUseCase` y `GetBatchBarcodeLabelsUseCase` (emisión de datos para impresión térmica 1D y logs `PRINT_BARCODE_LABEL`).
  - Crear `UpdateHardwareItemUseCase` (actualización de precios y estado con log `UPDATE_HARDWARE_ITEM`).
  - Crear `DecommissionHardwareItemUseCase` (baja lógica `DE_BAJA` con motivo obligatorio y log `DECOMMISSION_HARDWARE_ITEM`).
  - Crear `AttachHardwareChildUseCase` (**Exportable M2/M7**): acopla componente a chasis padre validando ubicación y estado.
  - Crear `DetachHardwareChildUseCase` (**Exportable M2/M7**): desacopla componente hijo.
  - Crear `ApproveUsedComponentUseCase` (**Exportable M5**): alta formal en inventario de componente usado con ubicación y código de barras.
- [x] **T1.4.3: Capa de Infraestructura**
  - Crear `hardware-item.mapper.ts` (mapeo `HardwareItem` $\leftrightarrow$ `HardwareItemEntity`).
  - Crear `prisma-hardware-item.repository.ts` implementando `HardwareItemRepositoryPort`.
  - Crear adaptador `crypto-serial-generator.adapter.ts` implementando `SerialGeneratorPort` con formato `MP-YYYYMMDD-XXXXXX`.
  - Crear DTOs HTTP Swagger con validaciones.
  - Crear `hardware-items.controller.ts` con todos los endpoints requeridos:
    - `POST /hardware-items/batch-inbound` (`ADMIN`)
    - `POST /hardware-items` (`ADMIN`)
    - `POST /hardware-items/validate-serials` (`ADMIN`)
    - `GET /hardware-items` (`ADMIN`, `VENDEDOR`, `TECNICO`)
    - `GET /hardware-items/scan/:code` (`ADMIN`, `VENDEDOR`, `TECNICO`)
    - `GET /hardware-items/:id` (`ADMIN`, `VENDEDOR`, `TECNICO`)
    - `GET /hardware-items/:id/lifecycle` (`ADMIN`, `VENDEDOR`, `TECNICO`)
    - `GET /hardware-items/:id/barcode-label` (`ADMIN`, `VENDEDOR`, `TECNICO`)
    - `POST /hardware-items/barcode-labels/batch` (`ADMIN`, `VENDEDOR`, `TECNICO`)
    - `PATCH /hardware-items/:id` (`ADMIN`)
    - `PATCH /hardware-items/:id/decommission` (`ADMIN`)
    - `POST /hardware-items/:id/children` (`ADMIN`)
    - `DELETE /hardware-items/:id/children/:childId` (`ADMIN`)
- [x] **T1.4.4: Ensamblado del Módulo**
  - Crear `hardware-items.module.ts` importando `CatalogModule` y `LocationsModule`.
  - Exportar `HARDWARE_ITEM_REPOSITORY`, `AttachHardwareChildUseCase`, `DetachHardwareChildUseCase`, `ApproveUsedComponentUseCase`, `ScanHardwareItemUseCase` y `GetHardwareItemDetailUseCase`.
  - Registrar `HardwareItemsModule` en `src/app.module.ts`.

---

## Fase 1.5: Módulo de Inventario por Cantidad (`src/modules/quantity-stock/`)
- [x] **T1.5.1: Capa de Dominio**
  - Crear entidad pura `src/modules/quantity-stock/domain/entities/quantity-stock.entity.ts` con invariante de saldo no negativo (`quantity >= 0`).
  - Crear puerto `src/modules/quantity-stock/domain/ports/out/quantity-stock-repository.port.ts` y exportar `QUANTITY_STOCK_REPOSITORY = Symbol('QUANTITY_STOCK_REPOSITORY')`.
- [x] **T1.5.2: Capa de Aplicación**
  - Crear DTOs puros: `inbound-quantity-stock-command.dto.ts`, `adjust-quantity-stock-command.dto.ts`, `decrease-quantity-stock-command.dto.ts`, `quantity-stock-response.dto.ts`.
  - Crear `InboundQuantityStockUseCase` (upsert por `(catalogId, locationId)`, incremento de stock y registro `INBOUND_QUANTITY_STOCK`).
  - Crear `AdjustQuantityStockUseCase` (ajuste manual con motivo obligatorio, cálculo de delta y registro `ADJUST_QUANTITY_STOCK`).
  - Crear `DecreaseQuantityStockUseCase` (**Exportable M2/M3**): reducción segura de existencias físicas sin permitir saldos negativos.
  - Crear `GetQuantityStocksUseCase` (consulta paginada con filtros por ubicación, categoría, catálogo y alerta `lowStock=true`).
- [x] **T1.5.3: Capa de Infraestructura**
  - Crear `quantity-stock.mapper.ts` (mapeo `QuantityStock` $\leftrightarrow$ `QuantityStockEntity`).
  - Crear `prisma-quantity-stock.repository.ts` implementando `QuantityStockRepositoryPort`.
  - Crear DTOs HTTP Swagger con validadores.
  - Crear `quantity-stock.controller.ts` con:
    - `POST /quantity-stock/inbound` (`ADMIN`)
    - `PATCH /quantity-stock/adjust` (`ADMIN`)
    - `GET /quantity-stock` (`ADMIN`, `VENDEDOR`, `TECNICO`)
- [x] **T1.5.4: Ensamblado del Módulo**
  - Crear `quantity-stock.module.ts` importando `CatalogModule` y `LocationsModule`.
  - Exportar `QUANTITY_STOCK_REPOSITORY`, `InboundQuantityStockUseCase`, `DecreaseQuantityStockUseCase` y `AdjustQuantityStockUseCase`.
  - Registrar `QuantityStockModule` en `src/app.module.ts`.

---

## Fase 1.6: Integración Global, Verificación y Contratos de API
- [x] **T1.6.1: Verificación de Ensamblado en `AppModule`**
  - Validar que todos los 4 módulos de inventario estén correctamente montados en `src/app.module.ts` sin colisiones de rutas ni dependencias circulares.
- [x] **T1.6.2: Verificación de Compilación y Pureza de Capas**
  - Ejecutar `npm run build` y asegurar **0 errores** de compilación en TypeScript.
  - Verificar que no existan imports de `@prisma/client`, `@nestjs/swagger` o decoradores en `domain/` ni en `application/`.
- [x] **T1.6.3: Actualización de Guía de Contratos de API (`specs/API_CONTRACTS.md`)**
  - Documentar exhaustivamente todos los endpoints de la Fase 1 en `specs/API_CONTRACTS.md` con ejemplos JSON reales de petición y respuesta para el equipo de Frontend.
