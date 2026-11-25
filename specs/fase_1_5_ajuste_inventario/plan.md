# Plan Técnico — Fase 1.5: Inventario Unificado Sincronizado y Rol Encargado de Almacén

## 1. Visión General y Alineación Arquitectural
Este plan técnico define la refactorización y extensión de los módulos del backend de **Mundo Portátil** para dar cumplimiento a la especificación de la **Fase 1.5** (`specs/fase_1_5_ajuste_inventario/spec.md`), alineándose estrictamente con la **Constitución Técnica** (`specs/CONSTITUTION.md`).

### Principios Fundamentales
1. **Arquitectura Monolito Modular Hexagonal Pura:**
   $$\text{Infrastructure (Adaptadores)} \longrightarrow \text{Application (Casos de Uso)} \longrightarrow \text{Domain (Entidades y Puertos)}$$
   - Las capas `domain/` y `application/` permanecen 100% libres de dependencias de `@prisma/client`, `@nestjs/swagger` y decoradores HTTP.
   - Los Casos de Uso dependen exclusivamente de interfaces (`Ports`) inyectadas con tokens `Symbol`.
2. **Aislamiento Modular sin Fuga de Persistencia:**
   - La comunicación intermodular se realiza únicamente a través de los Casos de Uso o Puertos públicos exportados por cada módulo.
   - Para las operaciones coordinadas entre `QuantityStock` y `HardwareItem`, se crea un módulo orquestador `InventoryModule` (`src/modules/inventory/`) que consume los casos de uso y puertos públicos sin acoplar repositorios de persistencia.
3. **Atomicidad y Sincronización Transaccional:**
   - Toda operación compuesta (Ingreso unificado, baja lógica y aprobación de segunda mano) se ejecuta dentro de una transacción gestionada por `TransactionManagerPort`.
   - `QuantityStock` actúa como la **fuente de verdad del saldo numérico total** por `(catalogId, locationId)` para todos los productos.
   - `HardwareItem` actúa como el **detalle atómico de series individuales** para productos serializados. Ambos se mantienen sincronizados 1:1.

---

## 2. Auditoría Exhaustiva de Archivos Afectados

A continuación se detalla el mapeo completo de archivos impactados por cada eje de cambio:

### 2.1 Eje 1: Rol `ENCARGADO_ALMACEN` (RBAC)
- **Base de Datos:**
  - `prisma/schema.prisma`: Agregar `ENCARGADO_ALMACEN` al `enum Role`.
- **Módulo de Usuarios (`src/modules/users/`):**
  - `src/modules/users/infrastructure/adapters/in/http/dto/create-user.http-dto.ts`: El enum `Role` de Swagger incluye automáticamente `ENCARGADO_ALMACEN`.
  - `src/modules/users/application/dto/create-user-command.dto.ts` y `update-user-command.dto.ts`: Soporte del nuevo rol en DTOs y validaciones.
- **Controladores con Permisos Actualizados:**
  - `src/modules/categories/infrastructure/adapters/in/http/categories.controller.ts`:
    - `POST /categories`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`
    - `PATCH /categories/:id`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`
    - `GET /categories`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)`
  - `src/modules/catalog/infrastructure/adapters/in/http/catalog.controller.ts`:
    - `POST /catalog`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`
    - `PATCH /catalog/:id`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`
    - `GET /catalog` y `GET /catalog/:id`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)`
  - `src/modules/hardware-items/infrastructure/adapters/in/http/hardware-items.controller.ts`:
    - `POST /hardware-items/validate-serials`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`
    - `POST /hardware-items/approve-used`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`
    - `PATCH /hardware-items/:id`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`
    - `PATCH /hardware-items/:id/decommission`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`
    - `GET /hardware-items/available-serials` (nuevo): `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)`
    - `GET /hardware-items`, `GET /hardware-items/scan/:code`, `GET /hardware-items/:id`, `GET /hardware-items/:id/lifecycle`, `GET /hardware-items/:id/barcode-label`, `POST /hardware-items/barcode-labels/batch`: Acceso extendido a `ENCARGADO_ALMACEN`.
  - `src/modules/quantity-stock/infrastructure/adapters/in/http/quantity-stock.controller.ts`:
    - `POST /quantity-stock/inbound`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`
    - `PATCH /quantity-stock/adjust`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`
    - `GET /quantity-stock`: Acceso extendido a `ENCARGADO_ALMACEN`.
  - `src/modules/locations/infrastructure/adapters/in/http/locations.controller.ts`:
    - `GET /locations`: `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)`

### 2.2 Eje 2: Eliminación del Campo `name` en `ProductCatalog`
- **Base de Datos:**
  - `prisma/schema.prisma`: Eliminar columna `name String` de `model ProductCatalog`.
- **Módulo de Catálogo (`src/modules/catalog/`):**
  - `src/modules/catalog/domain/entities/catalog-item.entity.ts`:
    - Eliminar propiedad `name` de constructor, `create()` y `updateDetails()`.
  - `src/modules/catalog/domain/ports/out/catalog-repository.port.ts`:
    - Actualizar interfaces de entidad y resúmenes.
  - `src/modules/catalog/application/dto/create-catalog-item-command.dto.ts` y `update-catalog-item-command.dto.ts`:
    - Eliminar campo `name`.
    - Hacer `sku` opcional en la creación.
  - `src/modules/catalog/application/dto/catalog-item-response.dto.ts`:
    - Eliminar `name`.
  - `src/modules/catalog/application/dto/create-pass-through-catalog-model-command.dto.ts`:
    - Eliminar `name` y adaptar construcción a `brand` + `model`.
  - `src/modules/catalog/application/use-cases/create-catalog-item.use-case.ts`:
    - Remover asignación de `name`.
    - Auto-generar `sku` con formato `MP-CAT-XXXXXX` si no es provisto; si se provee, validar unicidad (`409 Conflict`).
  - `src/modules/catalog/application/use-cases/update-catalog-item.use-case.ts`:
    - Remover actualización de `name`.
  - `src/modules/catalog/application/use-cases/get-catalog-items.use-case.ts`:
    - Remover `name` de mapeo de respuesta.
  - `src/modules/catalog/application/use-cases/get-catalog-item-detail.use-case.ts`:
    - Calcular `stockSummary` directamente desde `QuantityStock` (dado que `QuantityStock` consolida todos los modelos).
  - `src/modules/catalog/infrastructure/adapters/in/http/dto/create-catalog-item.http-dto.ts` y `update-catalog-item.http-dto.ts`:
    - Eliminar decoradores Swagger y validaciones de `name`.
  - `src/modules/catalog/infrastructure/adapters/in/http/dto/query-catalog.http-dto.ts`:
    - Búsqueda en `sku`, `brand`, `model` y `processor`.
  - `src/modules/catalog/infrastructure/adapters/out/persistence/catalog.mapper.ts`:
    - Remover `name` en `toDomain()` y `toPersistence()`.
  - `src/modules/catalog/infrastructure/adapters/out/persistence/prisma-catalog.repository.ts`:
    - Remover `name` de `create`, `update` y cláusulas `OR` de búsqueda.
    - Simplificar `findDetailWithStockSummary`: consultar existencias por ubicación únicamente desde `QuantityStock`.
- **Otros Módulos que consumían `catalog.name`:**
  - `src/modules/hardware-items/application/use-cases/get-barcode-label.use-case.ts` y `get-batch-barcode-labels.use-case.ts`:
    - Título de etiqueta: `${catalogItem.brand} ${catalogItem.model}`.
  - `src/modules/hardware-items/application/use-cases/approve-used-component.use-case.ts`:
    - Al clonar el catálogo usado, ya no se pasa `name`.
  - `src/modules/quantity-stock/application/use-cases/inbound-quantity-stock.use-case.ts` y `adjust-quantity-stock.use-case.ts`:
    - Adaptar `QuantityStockResponseDto` (reemplazar `catalogName` por `catalogBrand` y `catalogModel`, o generar `${catalog.brand} ${catalog.model}`).
  - `src/modules/quantity-stock/infrastructure/adapters/out/persistence/prisma-quantity-stock.repository.ts`:
    - Actualizar mapeo de `catalogName`.

### 2.3 Eje 3: Eliminación de la Jerarquía Padre-Hijo en Inventario
- **Base de Datos:**
  - `prisma/schema.prisma`: Se mantiene `parentChassisId` en `model HardwareItem` como campo nullable para no romper tablas externas (`SaleItem`, `ServiceItem`), pero queda en **desuso operativo** para las operaciones de ingreso e inventario.
- **Archivos a Eliminar o Desactivar en `src/modules/hardware-items/`:**
  - `src/modules/hardware-items/application/dto/attach-child-command.dto.ts` $\rightarrow$ Eliminar.
  - `src/modules/hardware-items/infrastructure/adapters/in/http/dto/attach-child.http-dto.ts` $\rightarrow$ Eliminar.
  - `src/modules/hardware-items/application/use-cases/attach-hardware-child.use-case.ts` $\rightarrow$ Eliminar de providers y exports.
  - `src/modules/hardware-items/application/use-cases/detach-hardware-child.use-case.ts` $\rightarrow$ Eliminar de providers y exports.
  - `src/modules/hardware-items/infrastructure/adapters/in/http/hardware-items.controller.ts`:
    - Remover rutas `POST /hardware-items/:id/children` y `DELETE /hardware-items/:id/children/:childId`.
  - `src/modules/hardware-items/domain/entities/hardware-item.entity.ts`:
    - Remover o simplificar métodos de acople/despiece (`attachChild`, `detachChild`).
  - `src/modules/hardware-items/application/use-cases/batch-inbound-hardware.use-case.ts`:
    - Queda obsoleto/reemplazado por `UnifiedInventoryInboundUseCase` en `InventoryModule`.

### 2.4 Eje 4: Sincronización Transaccional entre `QuantityStock` y `HardwareItem`
- **Nuevo Módulo Orquestador `InventoryModule` (`src/modules/inventory/`):**
  - Encapsula el flujo unificado de ingreso al Almacén Central y la emisión de etiquetas por modelo.
- **Sincronizaciones Específicas:**
  1. `POST /inventory/inbound`:
     - Resuelve automáticamente la ubicación `ALMACEN_CENTRAL`.
     - Actualiza obligatoriamente `QuantityStock` para cada ítem.
     - Inserta en `HardwareItem` de forma individual sólo si `hasSerialNumbers === true`.
  2. `PATCH /hardware-items/:id/decommission`:
     - Al dar de baja un ítem en `HardwareItem`, descuenta automáticamente `1` unidad de `QuantityStock` para su `(catalogId, locationId)` dentro de la transacción.
  3. `POST /hardware-items/approve-used`:
     - Al aprobar un ítem usado a `EN_STOCK`, incrementa automáticamente `1` unidad en `QuantityStock` para `(usedCatalogId, locationId)` dentro de la transacción.
  4. `PATCH /quantity-stock/adjust`:
     - Valida si existen series activas (`ItemStatus.EN_STOCK`) para ese `(catalogId, locationId)` en `HardwareItem`. Si existen, rechaza con `400 Bad Request`.
  5. `GET /hardware-items/available-serials` (Nuevo):
     - Consulta de series en `EN_STOCK` filtradas por `catalogId` y `locationId` (default `ALMACEN_CENTRAL`).
  6. `POST /inventory/barcode-labels/by-model` (Nuevo):
     - Impresión de $N$ copias de etiquetas usando `catalog.sku` como código 1D.

---

## 3. Plan de Modificaciones en Base de Datos (`prisma/schema.prisma`)

```prisma
// 1. Agregar ENCARGADO_ALMACEN
enum Role {
  ADMIN
  ENCARGADO_ALMACEN
  VENDEDOR
  TECNICO
}

// 2. Remover name de ProductCatalog
model ProductCatalog {
  id                   String                     @id @default(uuid())
  sku                  String                     @unique
  brand                String                     // Ej: "Acer", "Asus", "Micronics"
  model                String                     // Ej: "A515-56", "TE3023 BK"
  categoryId           String
  
  processor            String?
  ramCapacity          String?
  storageCapacity      String?
  gpu                  String?
  screenSize           String?

  isSerialized         Boolean                    @default(true)
  minStockThreshold    Int                        @default(2)
  basePrice            Decimal                    @db.Decimal(10, 2)
  isSecondHand         Boolean                    @default(false)
  active               Boolean                    @default(true)
  createdAt            DateTime                   @default(now())

  category             ComponentCategory          @relation(fields: [categoryId], references: [id])
  items                HardwareItem[]
  quantityStocks       QuantityStock[]
  passThroughApprovals PassThroughApprovalQueue[]

  @@map("product_catalog")
}
```

### Comandos de Sincronización
```bash
npx prisma validate
npx prisma db push --accept-data-loss
npx prisma generate
```

---

## 4. Arquitectura Detallada por Módulo

### 4.1 Nuevo Módulo: `InventoryModule` (`src/modules/inventory/`)
Este módulo se sitúa en la capa de coordinación de inventario transversal para unificar las operaciones de almacén central:

```
src/modules/inventory/
├── inventory.module.ts
├── application/
│   ├── dto/
│   │   ├── unified-inbound-command.dto.ts
│   │   ├── unified-inbound-response.dto.ts
│   │   ├── print-model-barcode-labels-command.dto.ts
│   │   └── model-barcode-label-response.dto.ts
│   └── use-cases/
│       ├── unified-inventory-inbound.use-case.ts
│       └── print-model-barcode-labels.use-case.ts
└── infrastructure/
    └── adapters/
        └── in/
            └── http/
                ├── inventory.controller.ts
                └── dto/
                    ├── unified-inbound.http-dto.ts
                    └── print-model-barcode-labels.http-dto.ts
```

#### Casos de Uso de `InventoryModule`:
1. `UnifiedInventoryInboundUseCase`:
   - Inyecta `TRANSACTION_MANAGER_PORT`, `LOCATION_REPOSITORY`, `CATALOG_REPOSITORY`, `QUANTITY_STOCK_REPOSITORY`, `HARDWARE_ITEM_REPOSITORY`, `AUDIT_LOG_PORT`.
   - Busca ubicación activa con `type === LocationType.ALMACEN_CENTRAL`.
   - En una transacción atómica:
     - Para cada ítem del payload:
       - Valida que `catalogId` exista y esté activo.
       - Ejecuta `upsert` en `QuantityStock` para `(catalogId, almacenCentralId)` sumando `quantity` y actualizando `costPrice`/`salePrice`.
       - Si `hasSerialNumbers === true` (o hay `serialNumbers`):
         - Valida que `serialNumbers.length === quantity`.
         - Valida series duplicadas en el payload o en BD (`findExistingSerials`).
         - Guarda `quantity` registros en `HardwareItem` con `status: 'EN_STOCK'`, `parentChassisId: null`.
   - Emite `UNIFIED_INVENTORY_INBOUND` en bitácora.
2. `PrintModelBarcodeLabelsUseCase`:
   - Inyecta `CATALOG_REPOSITORY`, `QUANTITY_STOCK_REPOSITORY`, `LOCATION_REPOSITORY`, `AUDIT_LOG_PORT`.
   - Genera arreglo de `copies` etiquetas térmicas con `barcodeValue = catalog.sku`, `title = "${catalog.brand} ${catalog.model}"`, ficha técnica formateada y precio.
   - Emite `PRINT_MODEL_BARCODE_LABELS` en bitácora.

---

### 4.2 Módulo de Catálogo Maestro (`src/modules/catalog/`)
- **Entidad `CatalogItemEntity`:**
  - Propiedades: `id`, `sku`, `brand`, `model`, `categoryId`, `processor`, `ramCapacity`, `storageCapacity`, `gpu`, `screenSize`, `isSerialized`, `minStockThreshold`, `basePrice`, `isSecondHand`, `active`, `createdAt`.
- **Casos de Uso:**
  - `CreateCatalogItemUseCase`: Si `sku` viene vacío/omitido, auto-genera `MP-CAT-XXXXXX` (usando `crypto.randomBytes(3).toString('hex').toUpperCase()`).
  - `GetCatalogItemDetailUseCase`: Consulta existencias directamente desde `QuantityStock` para cada ubicación activa.
  - `GetCatalogItemsUseCase`: Búsqueda multi-campo en `sku`, `brand`, `model` y `processor`.

---

### 4.3 Módulo de Hardware Items (`src/modules/hardware-items/`)
- **Casos de Uso a Modificar:**
  - `DecommissionHardwareItemUseCase`:
    - Inyecta `TRANSACTION_MANAGER_PORT` y `QUANTITY_STOCK_REPOSITORY`.
    - Al pasar a `DE_BAJA`, decrementa en `1` la cantidad en `QuantityStock` para `(item.catalogId, item.locationId)` en la misma transacción.
  - `ApproveUsedComponentUseCase`:
    - Inyecta `QUANTITY_STOCK_REPOSITORY`.
    - Al aprobar componente usado a `EN_STOCK`, incrementa en `1` la cantidad en `QuantityStock` para `(usedCatalogId, locationId)` en la misma transacción.
  - `GetBarcodeLabelUseCase` y `GetBatchBarcodeLabelsUseCase`:
    - `title` generado dinámicamente como `${catalog.brand} ${catalog.model}`.
- **Nuevo Caso de Uso:**
  - `GetAvailableSerialsUseCase`:
    - Inyecta `HARDWARE_ITEM_REPOSITORY` y `LOCATION_REPOSITORY`.
    - Parámetros: `catalogId` (obligatorio), `locationId` (opcional, si no se envía busca la de `ALMACEN_CENTRAL`).
    - Retorna lista ligera: `[{ id, serialNumber, salePrice, createdAt }]` con `status === 'EN_STOCK'`.
- **Limpieza de Padre-Hijo:**
  - Remover `attach-child-command.dto.ts`, `attach-child.http-dto.ts`.
  - Remover `AttachHardwareChildUseCase` y `DetachHardwareChildUseCase`.
  - Remover endpoints `POST /hardware-items/:id/children` y `DELETE /hardware-items/:id/children/:childId`.

---

### 4.4 Módulo de Stock por Cantidad (`src/modules/quantity-stock/`)
- **Casos de Uso a Modificar:**
  - `AdjustQuantityStockUseCase`:
    - Inyecta `HARDWARE_ITEM_REPOSITORY`.
    - Antes de modificar el saldo, consulta si existen ítems en `HardwareItem` con `catalogId`, `locationId` y `status === 'EN_STOCK'`.
    - Si el conteo es $> 0$, arroja `BadRequestException`: *"No se permite el ajuste manual numérico para productos con series activas en stock. Debe ingresar o dar de baja las series individuales correspondientes."*
  - `InboundQuantityStockUseCase` y `GetQuantityStocksUseCase`:
    - Adaptar respuestas para representar el producto mediante `catalogBrand` y `catalogModel`.

---

## 5. Matriz de Roles y Permisos (RBAC) Final de la Fase 1.5

| Endpoint | Método | Roles Permitidos | Propósito |
| :--- | :---: | :--- | :--- |
| `/categories` | `POST` | `ADMIN`, `ENCARGADO_ALMACEN` | Crear nueva categoría |
| `/categories/:id` | `PATCH` | `ADMIN`, `ENCARGADO_ALMACEN` | Editar o desactivar categoría |
| `/categories` | `GET` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | Listar categorías |
| `/catalog` | `POST` | `ADMIN`, `ENCARGADO_ALMACEN` | Crear producto maestro (auto-genera SKU si falta) |
| `/catalog/:id` | `PATCH` | `ADMIN`, `ENCARGADO_ALMACEN` | Editar o desactivar producto maestro |
| `/catalog` | `GET` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | Listar catálogo paginado con búsqueda |
| `/catalog/:id` | `GET` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | Ficha técnica y stock por puesto/almacén |
| `/inventory/inbound` | `POST` | `ADMIN`, `ENCARGADO_ALMACEN` | **Ingreso unificado al Almacén Central (con o sin series)** |
| `/inventory/barcode-labels/by-model` | `POST` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | **Impresión de $N$ copias de etiqueta 1D por SKU** |
| `/hardware-items/available-serials` | `GET` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | **Consultar series disponibles en Almacén Central** |
| `/hardware-items/validate-serials` | `POST` | `ADMIN`, `ENCARGADO_ALMACEN` | Validar si series ya existen en BD |
| `/hardware-items/approve-used` | `POST` | `ADMIN`, `ENCARGADO_ALMACEN` | Aprobar pieza usada (sincroniza `QuantityStock`) |
| `/hardware-items/:id/decommission` | `PATCH` | `ADMIN`, `ENCARGADO_ALMACEN` | Dar de baja ítem con motivo (sincroniza `QuantityStock`) |
| `/hardware-items/:id` | `PATCH` | `ADMIN`, `ENCARGADO_ALMACEN` | Modificar precio o ubicación de hardware |
| `/hardware-items/scan/:code` | `GET` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | Scanner-first por serie o código interno |
| `/hardware-items` | `GET` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | Listar hardware serializado |
| `/hardware-items/:id` | `GET` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | Detalle de hardware |
| `/hardware-items/:id/lifecycle` | `GET` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | Hoja de vida (bitácora M6) |
| `/hardware-items/:id/barcode-label` | `GET` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | Etiqueta 1D individual de serie |
| `/hardware-items/barcode-labels/batch` | `POST` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | Etiquetas 1D para lote de series |
| `/quantity-stock/inbound` | `POST` | `ADMIN`, `ENCARGADO_ALMACEN` | Entrada de stock por cantidad |
| `/quantity-stock/adjust` | `PATCH` | `ADMIN`, `ENCARGADO_ALMACEN` | Ajuste manual (bloqueado si hay series en stock) |
| `/quantity-stock` | `GET` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | Listar existencias cuantitativas y stock bajo |
| `/locations` | `GET` | `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO` | Listar puestos y almacenes |
| `/users` | `POST`, `GET`, `PATCH` | `ADMIN` | Exclusivo ADMIN |
| `/audit-logs` | `GET` | `ADMIN` | Exclusivo ADMIN |

---

## 6. Verificación y Criterios de Aceptación
1. `npm run build` compila con **0 errores** de TypeScript.
2. Todas las capas `domain/` y `application/` continúan estrictamente puras (0 dependencias externas).
3. Prueba de sincronización atómica:
   - Ingreso mixto (`hasSerialNumbers: true` y `false`) crea `QuantityStock` para ambos y `HardwareItem` sólo para los serializados.
   - Decommission decrementa `QuantityStock` en 1.
   - Ajuste manual sobre ítem con series arroja `400 Bad Request`.
4. Documentación completa en Swagger (`/api`) y actualización exhaustiva de `specs/API_CONTRACTS.md`.
