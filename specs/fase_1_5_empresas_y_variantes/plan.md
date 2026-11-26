# Plan de Implementación — Fase 1.5: Empresas Remitentes/Facturadoras (`Company`) y Color por Serie

## 1. Resumen Ejecutivo y Auditoría del Estado Actual

### 1.1 Auditoría de Base de Datos y Modelos
Tras auditar la base de datos de desarrollo conectada en Supabase PostgreSQL mediante Prisma v5.22.0, se identificó el siguiente estado de datos existente:
- **`hardware_items`:** 28 registros activos en producción/desarrollo.
- **`quantity_stocks`:** 11 registros con existencias consolidadas.
- **`internal_transfer_items`:** 3 registros de transferencias previas.
- **`companies`:** Tabla aún no existente.

### 1.2 Riesgo Crítico de Migración y Estrategia de Backfill Seguro
Aplicar directamente una restricción `NOT NULL` en columnas nuevas como `companyId` en `hardware_items` o `quantity_stocks` mediante `npx prisma db push` causaría un fallo fatal o requeriría truncar las tablas (pérdida irreparable de datos). Asimismo, la clave única `@@unique([catalogId, locationId])` en `quantity_stocks` debe evolucionar a `@@unique([catalogId, locationId, companyId])`.

**Estrategia en 2 Fases (Zero Downtime / Zero Data Loss):**
1. **Paso A (Esquema Intermedio):** Crear modelo `Company` y añadir `color String?` en `HardwareItem`, `companyId String?` (nullable) en `HardwareItem`, `QuantityStock` e `InternalTransferItem`. Ejecutar `npx prisma db push` sin fricciones.
2. **Paso B (Script de Backfill Idempotente):** Ejecutar un script de migración que:
   - Cree la empresa semilla inicial si no existe: `Mundo Portátil S.A.C.` (RUC `20601234567`, Dirección `Av. Bolognesi 123, Tacna`, `active: true`).
   - Actualice masivamente todas las filas existentes con `companyId IS NULL` asignándoles el ID de esta empresa inicial en `hardware_items`, `quantity_stocks` e `internal_transfer_items`.
3. **Paso C (Esquema Final Estricto):** Cambiar `companyId String` a obligatorio (`NOT NULL`), configurar `@@unique([catalogId, locationId, companyId])` en `quantity_stocks`, y ejecutar `npx prisma db push` y `npx prisma generate`.
4. **Paso D (Persistencia en Seed):** Incorporar la creación/upsert de la empresa por defecto en `prisma/seed.ts` para despliegues limpios futuros.

---

## 2. Modificaciones en Esquema Prisma (`prisma/schema.prisma`)

Manteniendo estrictamente **Prisma v5.22.0** (`@prisma/client@5.22.0`):

```prisma
// ==========================================
// EMPRESAS REMITENTES / FACTURADORAS
// ==========================================
model Company {
  id             String                 @id @default(uuid())
  name           String                 @unique
  ruc            String                 @unique
  address        String
  active         Boolean                @default(true)
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt

  hardwareItems  HardwareItem[]
  quantityStocks QuantityStock[]
  transferItems  InternalTransferItem[]

  @@map("companies")
}

// ------------------------------------------
// 1. PRODUCTOS SERIALIZADOS (Con N/S individual)
// ------------------------------------------
model HardwareItem {
  id              String         @id @default(uuid())
  serialNumber    String         @unique
  color           String?        // Variante estética por número de serie
  companyId       String         // Empresa propietaria/remitente
  catalogId       String
  locationId      String
  status          ItemStatus     @default(EN_STOCK)
  
  parentChassisId String?        
  parentChassis   HardwareItem?  @relation("LaptopComponents", fields: [parentChassisId], references: [id])
  components      HardwareItem[] @relation("LaptopComponents")

  costPrice       Decimal?       @db.Decimal(10, 2)
  salePrice       Decimal?       @db.Decimal(10, 2)
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  company         Company        @relation(fields: [companyId], references: [id])
  catalog         ProductCatalog @relation(fields: [catalogId], references: [id])
  location        Location       @relation(fields: [locationId], references: [id])

  saleItems       SaleItem[]
  transferItems   InternalTransferItem[]
  secondHandQueue SecondHandApprovalQueue[]
  serviceItems    ServiceItem[]

  @@index([companyId])
  @@map("hardware_items")
}

// ------------------------------------------
// 2. PRODUCTOS POR CANTIDAD
// ------------------------------------------
model QuantityStock {
  id            String         @id @default(uuid())
  catalogId     String
  locationId    String
  companyId     String         // Existencias desglosadas por empresa
  quantity      Int            @default(0)
  costPrice     Decimal?       @db.Decimal(10, 2)
  salePrice     Decimal?       @db.Decimal(10, 2)
  updatedAt     DateTime       @updatedAt

  company       Company        @relation(fields: [companyId], references: [id])
  catalog       ProductCatalog @relation(fields: [catalogId], references: [id])
  location      Location       @relation(fields: [locationId], references: [id])

  saleItems     SaleItem[]

  @@unique([catalogId, locationId, companyId])
  @@index([companyId])
  @@map("quantity_stocks")
}

// ------------------------------------------
// TRASLADOS DIRECTOS
// ------------------------------------------
model InternalTransferItem {
  id             String           @id @default(uuid())
  transferId     String
  catalogId      String
  companyId      String?          // Empresa del ítem trasladado
  hardwareItemId String?          
  quantity       Int              @default(1)

  transfer       InternalTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  catalog        ProductCatalog   @relation(fields: [catalogId], references: [id])
  hardwareItem   HardwareItem?    @relation(fields: [hardwareItemId], references: [id])
  company        Company?         @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@map("internal_transfer_items")
}
```

---

## 3. Arquitectura Hexagonal del Nuevo Módulo `src/modules/companies/`

Siguiendo `@specs/CONSTITUTION.md`:

```
src/modules/companies/
├── companies.module.ts
├── domain/
│   ├── entities/
│   │   └── company.entity.ts
│   └── ports/
│       └── out/
│           └── company-repository.port.ts (Token: COMPANY_REPOSITORY)
├── application/
│   ├── dto/
│   │   ├── company-response.dto.ts
│   │   ├── create-company-command.dto.ts
│   │   └── update-company-command.dto.ts
│   └── use-cases/
│       ├── create-company.use-case.ts
│       ├── get-companies.use-case.ts
│       └── update-company.use-case.ts
└── infrastructure/
    ├── adapters/
    │   ├── in/
    │   │   └── http/
    │   │       ├── companies.controller.ts
    │   │       └── dto/
    │   │           ├── create-company.http-dto.ts
    │   │           └── update-company.http-dto.ts
    │   └── out/
    │       └── persistence/
    │           ├── company.mapper.ts
    │           └── prisma-company.repository.ts
```

### 3.1 Entidad de Dominio `CompanyEntity`
- Invariantes:
  - `name`: string no vacío (trim).
  - `ruc`: validación de 11 dígitos numéricos (`/^\d{11}$/`).
  - `address`: string no vacío.
  - `active`: booleano.
- Métodos:
  - `static create(props)`
  - `update(props)`

### 3.2 Puerto de Salida `CompanyRepositoryPort`
- Métodos:
  - `save(company: CompanyEntity): Promise<CompanyEntity>`
  - `findById(id: string): Promise<CompanyEntity | null>`
  - `findByName(name: string): Promise<CompanyEntity | null>`
  - `findByRuc(ruc: string): Promise<CompanyEntity | null>`
  - `findAll(options?: { active?: boolean; search?: string }): Promise<CompanyEntity[]>`
  - `update(company: CompanyEntity): Promise<CompanyEntity>`
- Símbolo de Inyección: `export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY');`

### 3.3 Casos de Uso
1. **`CreateCompanyUseCase`:**
   - Valida unicidad case-insensitive de `name` (`409 Conflict`).
   - Valida formato y unicidad de `ruc` (`409 Conflict` si ya existe, `400 Bad Request` si no tiene 11 dígitos).
   - Guarda entidad y registra bitácora `CREATE_COMPANY`.
2. **`GetCompaniesUseCase`:**
   - Permite filtrar por `active?: boolean` y búsqueda general `search?: string` (por nombre o RUC).
3. **`UpdateCompanyUseCase`:**
   - Permite modificar `name`, `ruc`, `address` y `active` (soft delete).
   - Valida colisiones de `name` o `ruc` con otras empresas (`409 Conflict`).
   - Registra evento `UPDATE_COMPANY` en bitácora.

### 3.4 Adaptador HTTP (`CompaniesController`)
- `@ApiTags('Companies')`
- `@ApiBearerAuth()` y `@UseGuards(JwtAuthGuard, RolesGuard)`
- `POST /companies`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`
- `GET /companies`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)`
- `PATCH /companies/:id`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`

---

## 4. Ajustes en Módulos Existentes

### 4.1 Módulo `inventory` (`UnifiedInventoryInboundUseCase`)
- **DTO de Entrada:**
  - `hasSerialNumbers: true`:
    - Reemplaza `serialNumbers: string[]` por `serialEntries: Array<{ serialNumber: string; color?: string; companyId: string }>`.
    - Valida que `serialEntries.length === quantity`.
    - Valida que cada `serialNumber` sea único en el lote y no exista en base de datos.
    - Valida que cada `companyId` pertenezca a una `Company` activa (`CompanyRepositoryPort.findById`).
    - Guarda cada serie con su `color` y `companyId`.
    - Agrupa las series por `(catalogId, centralLocation.id, companyId)` e invoca `quantityStockRepository.upsert(...)` sumando las cantidades exactas por empresa.
  - `hasSerialNumbers: false`:
    - Cada ítem en `items[]` requiere obligatoriamente `companyId: string` (UUID de empresa activa).
    - Permite múltiples líneas con el mismo `catalogId` si tienen distinto `companyId`.
    - Ejecuta `quantityStockRepository.upsert(catalogId, centralLocation.id, companyId, quantity, costPrice, salePrice, tx)`.

### 4.2 Módulo `hardware-items`
- **Entidad `HardwareItemEntity`:**
  - Incorpora `color: string | null` y `companyId: string`.
  - Actualiza métodos `create`, `updateDetails`, `attachChild`, `detachChild`, `transferDirect`.
- **Casos de Uso:**
  - `CreateHardwareItemUseCase` (`POST /hardware-items`):
    - Requiere `companyId` (empresa activa) y acepta `color?`.
    - Ejecuta dentro de transacción `quantityStockRepository.upsert(catalogId, locationId, companyId, 1, ...)`.
  - `UpdateHardwareItemUseCase` (`PATCH /hardware-items/:id`):
    - Acepta `color?: string | null`.
  - `DecommissionHardwareItemUseCase` (`PATCH /hardware-items/:id/decommission`):
    - Decrementa `-1` en `QuantityStock` pasando `(item.catalogId, item.locationId, item.companyId)`.
  - `ApproveUsedComponentUseCase` (`POST /hardware-items/approve-used`):
    - Acepta `companyId?: string` opcional (si se omite, hereda el `item.companyId` del componente original).
    - Incrementa `+1` en `QuantityStock` para `(targetCatalogId, locationId, effectiveCompanyId)`.
  - `GetHardwareItemsUseCase` y Consultas:
    - Agrega filtros por `companyId?: string` y `color?: string`.
    - La búsqueda `search?: string` incluye coincidencia en `color`.
    - Los DTOs de respuesta incluyen `color`, `companyId`, `companyName`, `companyRuc`.

### 4.3 Módulo `quantity-stock`
- **Entidad `QuantityStockEntity`:**
  - Incorpora `companyId: string`.
- **Puerto y Repositorio Prisma:**
  - `findByCatalogAndLocation` evoluciona a `findByCatalogLocationAndCompany(catalogId, locationId, companyId, tx)`.
  - `upsert` actualiza su firma: `upsert(catalogId, locationId, companyId, incrementBy, costPrice?, salePrice?, tx)` usando la clave única compuesta `catalogId_locationId_companyId`.
  - `findAll` acepta `companyId?: string` e incluye la relación con `company` para devolver `companyName` y `companyRuc`.
- **Casos de Uso:**
  - `InboundQuantityStockUseCase` (`POST /quantity-stock/inbound`):
    - Exige `companyId` (UUID de empresa activa).
  - `AdjustQuantityStockUseCase` (`PATCH /quantity-stock/adjust`):
    - Exige `companyId`.
    - Valida que `countByCatalogLocationCompanyAndStatus(catalogId, locationId, companyId, 'EN_STOCK') === 0`.
    - Ajusta el registro específico `(catalogId, locationId, companyId)`.

### 4.4 Módulo `catalog` (`GetCatalogDetailUseCase`)
- `PrismaCatalogRepository.findDetailWithStockSummary(id)`:
  - Suma todas las filas de `QuantityStock` del catálogo en la ubicación para calcular `totalAvailable`.
  - Construye para cada ubicación el arreglo `companyBreakdown: Array<{ companyId, companyName, companyRuc, quantity }>`.
  - Expone `companyBreakdown` dentro de cada elemento de `stockSummary` en `CatalogDetailResponseDto`.

### 4.5 Módulo `transfers` (`CreateDirectTransferUseCase`)
- **Serializados:**
  - Al trasladar cada serie entre `fromLocationId` y `toLocationId`, decrementa `-1` en `QuantityStock` de `(item.catalogId, fromLocationId, item.companyId)` e incrementa `+1` en `(item.catalogId, toLocationId, item.companyId)`.
  - Guarda `companyId: item.companyId` en `InternalTransferItem`.
- **Cuantitativos:**
  - DTO exige `quantities: Array<{ catalogId: string; companyId: string; quantity: number }>`.
  - Valida que no existan combinaciones duplicadas de `(catalogId, companyId)` (permitiendo el mismo `catalogId` si tiene distinto `companyId`).
  - Descuenta origen e incrementa destino en `QuantityStock` por `(catalogId, locationId, companyId)`.
  - Guarda `companyId` en `InternalTransferItem`.

---

## 5. Estrategia de Pruebas Unitarias

Se desarrollarán pruebas unitarias exhaustivas con Jest para:
1. `CreateCompanyUseCaseSpec`: Validar creación, unicidad de nombre, validación de RUC 11 dígitos, y auditoría.
2. `GetCompaniesUseCaseSpec`: Validar filtrado por `active` y búsqueda.
3. `UpdateCompanyUseCaseSpec`: Validar actualización y prevención de colisiones.
4. `UnifiedInventoryInboundUseCaseSpec`: Validar ingreso serializado con múltiples empresas y colores en el mismo lote, e ingreso cuantitativo multi-empresa.
5. `CreateDirectTransferUseCaseSpec`: Validar descuento e incremento exacto por empresa en serializados y cuantitativos, y validación de duplicados por `(catalogId, companyId)`.
6. `AdjustQuantityStockUseCaseSpec`: Validar ajuste por empresa y bloqueo si hay series activas.

---

## 6. Actualización de Contratos de API (`@specs/API_CONTRACTS.md`)

Se documentará de manera completa:
- **Nuevo Módulo: `Companies`:**
  - `POST /companies`: Creación de empresas con Swagger y ejemplos.
  - `GET /companies`: Listado y filtros.
  - `PATCH /companies/:id`: Actualización y soft delete.
- **Actualización de Endpoints de Inventario:**
  - `POST /inventory/inbound`: Nueva estructura `serialEntries` y `companyId` en cuantitativos.
  - `POST /hardware-items`, `GET /hardware-items`, `PATCH /hardware-items/:id`, `POST /hardware-items/approve-used`.
  - `POST /quantity-stock/inbound`, `PATCH /quantity-stock/adjust`, `GET /quantity-stock`.
  - `GET /catalog/:id`: Inclusión de `companyBreakdown`.
  - `POST /transfers/direct`: Inclusión de `companyId` en `quantities`.
