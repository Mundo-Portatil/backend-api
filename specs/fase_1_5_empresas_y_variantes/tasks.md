# Lista de Tareas — Fase 1.5: Empresas Remitentes/Facturadoras (`Company`) y Color por Serie

## Fase 1: Esquema Prisma y Protocolo de Migración Segura (Zero Data Loss)
- [x] **Task 1.1: Esquema Intermedio Prisma v5.22.0**
  - Modificar `prisma/schema.prisma` agregando el modelo `Company` (`id`, `name`, `ruc`, `address`, `active`, timestamps).
  - Agregar `color String?` en `HardwareItem`.
  - Agregar temporalmente `companyId String?` (nullable) en `HardwareItem`, `QuantityStock` e `InternalTransferItem`.
  - Ejecutar `npx prisma db push` para crear la tabla `companies` y las columnas en PostgreSQL sin conflictos con datos existentes.
- [x] **Task 1.2: Script de Backfill Idempotente**
  - Crear script `scripts/backfill-initial-company.ts` que:
    1. Asegure la existencia de la empresa inicial `Mundo Portátil S.A.C.` (RUC: `20601234567`, Dirección: `Av. Bolognesi 123, Tacna`, `active: true`).
    2. Ejecute updates seguros en los 28 registros de `hardware_items`, 11 de `quantity_stocks` y 3 de `internal_transfer_items` asignando el ID de la empresa inicial donde `companyId IS NULL`.
  - Ejecutar el script y validar que no quede ningún registro con `companyId` nulo.
- [x] **Task 1.3: Esquema Final Prisma y Clave Única Compuesta**
  - En `prisma/schema.prisma`, cambiar `companyId String` a obligatorio (`NOT NULL`) en `HardwareItem` y `QuantityStock`.
  - Actualizar la clave única de `QuantityStock` a `@@unique([catalogId, locationId, companyId])`.
  - Mantener `companyId String?` en `InternalTransferItem`.
  - Ejecutar `npx prisma db push` y `npx prisma generate` con Prisma v5.22.0.
- [x] **Task 1.4: Actualización de `prisma/seed.ts`**
  - Agregar la creación / upsert de la empresa por defecto `Mundo Portátil S.A.C.` en `prisma/seed.ts`.
  - Verificar la ejecución exitosa de `npx ts-node prisma/seed.ts`.

---

## Fase 2: Implementación Hexagonal del Módulo `src/modules/companies/`
- [x] **Task 2.1: Capa de Dominio**
  - Crear `src/modules/companies/domain/entities/company.entity.ts` con validación de 11 dígitos en RUC y métodos inmutables.
  - Crear `src/modules/companies/domain/ports/out/company-repository.port.ts` definiendo la interfaz y el símbolo de inyección `COMPANY_REPOSITORY`.
- [x] **Task 2.2: Capa de Aplicación (DTOs y Casos de Uso)**
  - Crear DTOs: `company-response.dto.ts`, `create-company-command.dto.ts` y `update-company-command.dto.ts`.
  - Crear `CreateCompanyUseCase`: valida unicidad de nombre y RUC, persiste y registra en `AuditLogPort` (`CREATE_COMPANY`).
  - Crear `GetCompaniesUseCase`: soporta filtro `active?: boolean` y búsqueda general `search?: string`.
  - Crear `UpdateCompanyUseCase`: actualiza datos/estado activo, previene colisiones y registra en `AuditLogPort` (`UPDATE_COMPANY`).
- [x] **Task 2.3: Capa de Infraestructura (Persistencia Prisma y Mappers)**
  - Crear `src/modules/companies/infrastructure/adapters/out/persistence/company.mapper.ts`.
  - Crear `src/modules/companies/infrastructure/adapters/out/persistence/prisma-company.repository.ts` implementando `CompanyRepositoryPort`.
- [x] **Task 2.4: Capa de Infraestructura (Adaptador HTTP y DTOs)**
  - Crear DTOs de validación con `class-validator` y Swagger: `create-company.http-dto.ts` y `update-company.http-dto.ts` (validación de RUC con `@Matches(/^\d{11}$/)`).
  - Crear `CompaniesController` con `@ApiTags('Companies')`, rutas protegidas por `JwtAuthGuard` y `RolesGuard`:
    - `POST /companies` (`ADMIN`, `ENCARGADO_ALMACEN`)
    - `GET /companies` (`ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO`)
    - `PATCH /companies/:id` (`ADMIN`, `ENCARGADO_ALMACEN`)
- [x] **Task 2.5: Cableado de Módulo y Registro Global**
  - Crear `CompaniesModule` proveyendo `{ provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository }` y exportando `COMPANY_REPOSITORY` y sus casos de uso.
  - Registrar `CompaniesModule` en `src/app.module.ts`.

---

## Fase 3: Ajustes en Módulos de Stock y Hardware
- [x] **Task 3.1: Ajustes en `src/modules/quantity-stock/`**
  - Actualizar `QuantityStockEntity` para incluir `companyId`.
  - Actualizar `QuantityStockRepositoryPort` y `PrismaQuantityStockRepository`:
    - Modificar `findByCatalogAndLocation` a `findByCatalogLocationAndCompany(catalogId, locationId, companyId, tx)`.
    - Modificar `upsert` para requerir `companyId` y usar `catalogId_locationId_companyId`.
    - Modificar `findAll` para soportar filtro `companyId?: string` e incluir `companyName` y `companyRuc` en la respuesta.
  - Actualizar `InboundQuantityStockUseCase` y su HTTP DTO para requerir `companyId` validado.
  - Actualizar `AdjustQuantityStockUseCase` y su HTTP DTO para requerir `companyId` y validar que no existan series activas para dicha empresa.
- [x] **Task 3.2: Ajustes en `src/modules/hardware-items/`**
  - Actualizar `HardwareItemEntity` incorporando `color: string | null` y `companyId: string`.
  - Actualizar `HardwareItemMapper` y `PrismaHardwareItemRepository` para mapear `color` y `companyId`, soportar filtros `companyId` y `color`, e incluir `company` en consultas.
  - Actualizar `CreateHardwareItemUseCase` (`POST /hardware-items`): requerir `companyId`, aceptar `color?`, y sincronizar `+1` en `QuantityStock` transaccionalmente.
  - Actualizar `UpdateHardwareItemUseCase` (`PATCH /hardware-items/:id`): permitir actualizar `color`.
  - Actualizar `DecommissionHardwareItemUseCase` (`PATCH /hardware-items/:id/decommission`): decrementar stock en `QuantityStock` por `(catalogId, locationId, item.companyId)`.
  - Actualizar `ApproveUsedComponentUseCase` (`POST /hardware-items/approve-used`): aceptar `companyId` opcional (hereda original si se omite) e incrementar `QuantityStock` por `(targetCatalogId, locationId, effectiveCompanyId)`.
  - Actualizar DTOs de respuesta de hardware para incluir `color`, `companyId`, `companyName` y `companyRuc`.

---

## Fase 4: Ajustes en Ingreso Unificado (`src/modules/inventory/`)
- [x] **Task 4.1: DTOs de Ingreso Unificado**
  - Actualizar `UnifiedInboundItemHttpDto` y `UnifiedInboundItemCommandDto`:
    - Serializados: reemplazar `serialNumbers?: string[]` por `serialEntries?: Array<{ serialNumber: string; color?: string; companyId: string }>`.
    - Cuantitativos: agregar `companyId?: string` obligatorio cuando `hasSerialNumbers === false`.
- [x] **Task 4.2: Lógica de `UnifiedInventoryInboundUseCase`**
  - Inyectar `COMPANY_REPOSITORY` y validar que todos los `companyId` pertenezcan a empresas activas.
  - En serializados: validar longitud, seriales únicos en lote y DB, crear `HardwareItem` con `color` y `companyId`, y agrupar por `companyId` para incrementar `QuantityStock` por empresa.
  - En cuantitativos: upsert directo en `QuantityStock` con `companyId`.

---

## Fase 5: Ajustes en Detalle de Catálogo (`src/modules/catalog/`)
- [x] **Task 5.1: Desglose por Empresa en Catálogo**
  - Modificar `LocationStockDetail` y `CatalogDetailResponseDto` agregando `companyBreakdown: Array<{ companyId: string; companyName: string; companyRuc: string; quantity: number }>`.
  - Actualizar `PrismaCatalogRepository.findDetailWithStockSummary`:
    - Sumar cantidades de todas las empresas en la ubicación para calcular `totalAvailable`.
    - Agrupar por empresa en cada ubicación para poblar `companyBreakdown`.

---

## Fase 6: Ajustes en Traslados Directos (`src/modules/transfers/`)
- [x] **Task 6.1: Trazabilidad de Empresa en Traslados**
  - Actualizar `InternalTransferItemEntity` para incluir `companyId`.
  - Actualizar `CreateDirectTransferCommandDto` y HTTP DTO:
    - En `quantities`: exigir `Array<{ catalogId: string; companyId: string; quantity: number }>`.
    - Validar que no haya duplicados de la tupla `(catalogId, companyId)`.
  - Actualizar `CreateDirectTransferUseCase`:
    - En serializados: decrementar origen e incrementar destino en `QuantityStock` para `(item.catalogId, locationId, item.companyId)`, y asignar `companyId` a `InternalTransferItem`.
    - En cuantitativos: decrementar origen e incrementar destino en `QuantityStock` para `(catalogId, locationId, companyId)`, y asignar `companyId` a `InternalTransferItem`.

---

## Fase 7: Pruebas Unitarias Exhaustivas
- [x] **Task 7.1: Pruebas Unitarias de `Companies`**
  - Crear `src/modules/companies/application/use-cases/create-company.use-case.spec.ts`.
  - Crear `src/modules/companies/application/use-cases/get-companies.use-case.spec.ts`.
  - Crear `src/modules/companies/application/use-cases/update-company.use-case.spec.ts`.
- [x] **Task 7.2: Pruebas Unitarias de Ingreso Unificado**
  - Crear/actualizar `unified-inventory-inbound.use-case.spec.ts` probando ingreso serializado con variantes de color y múltiples empresas en un solo lote, e ingreso cuantitativo multi-empresa.
- [x] **Task 7.3: Actualización de Pruebas Unitarias de Traslados**
  - Actualizar `create-direct-transfer.use-case.spec.ts` para verificar la sincronización de `QuantityStock` por empresa y la validación de `quantities` por tupla `(catalogId, companyId)`.
- [x] **Task 7.4: Pruebas Unitarias de Stock Cuantitativo**
  - Crear/actualizar pruebas de `adjust-quantity-stock.use-case.spec.ts` validando el ajuste por empresa y el bloqueo ante series activas.

---

## Fase 8: Actualización de Contratos de API y Verificación Final
- [x] **Task 8.1: Actualizar `@specs/API_CONTRACTS.md`**
  - Documentar el nuevo módulo `Companies` (`POST /companies`, `GET /companies`, `PATCH /companies/:id`).
  - Actualizar la documentación y payloads de ejemplo de `POST /inventory/inbound`, `POST /hardware-items`, `GET /hardware-items`, `PATCH /hardware-items/:id`, `POST /hardware-items/approve-used`, `GET /quantity-stock`, `POST /quantity-stock/inbound`, `PATCH /quantity-stock/adjust`, `GET /catalog/:id` y `POST /transfers/direct`.
- [x] **Task 8.2: Verificación de Integridad y Build**
  - Ejecutar `npx prisma validate`.
  - Ejecutar `npm run build` verificando 0 errores de TypeScript.
  - Ejecutar `npm test` verificando que todas las suites pasen al 100%.
