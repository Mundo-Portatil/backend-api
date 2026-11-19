# Plan Técnico — Fase 1: Categorías, Catálogo Maestro, Lotes, Inventario (Serializado/Cantidad) y Trazabilidad

## 1. Visión General y Alineación Arquitectural
Este plan define la implementación técnica de la **Fase 1** del backend de **Mundo Portátil**, siguiendo estrictamente la **Constitución Técnica** (`specs/CONSTITUTION.md`), la especificación de fase (`specs/fase_1_inventario/spec.md`) y el modelo de datos en Prisma (`prisma/schema.prisma`).

### Principios de la Arquitectura Monolito Modular Hexagonal
1. **Regla de Dependencia Estricta:**
   $$\text{Infrastructure (Adaptadores)} \longrightarrow \text{Application (Casos de Uso)} \longrightarrow \text{Domain (Entidades y Puertos)}$$
   - Las capas `domain/` y `application/` son completamente **puras**: queda terminantemente prohibido importar `@prisma/client`, `@nestjs/swagger` o decoradores HTTP en ellas.
2. **Inversión de Dependencias (Puertos y Adaptadores):**
   - Los Casos de Uso dependen exclusivamente de contratos e interfaces (`Ports`) ubicados en `domain/ports/out/`.
   - La inyección en NestJS se realiza mediante `Symbols` (`@Inject(PORT_TOKEN)`).
   - Los adaptadores concretos (`PrismaCategoryRepository`, `PrismaHardwareItemRepository`, etc.) residen en `infrastructure/adapters/out/persistence/`.
3. **Aislamiento Modular y Núcleo Compartido:**
   - Cada módulo de negocio reside en su propia carpeta en `src/modules/` (`categories`, `catalog`, `hardware-items`, `quantity-stock`).
   - El núcleo transversal reside en `src/shared/`: alberga `PrismaService`, `AuditLogPort` (M6) y `TransactionManagerPort` (Unit of Work).
   - Ningún módulo accede a la persistencia interna ni a los repositorios Prisma de otro módulo. La comunicación se realiza únicamente mediante la inyección de los Casos de Uso o Puertos públicos exportados.

---

## 2. Inspección y Alineación con `prisma/schema.prisma`

A partir de la inspección exhaustiva de `prisma/schema.prisma`, se identifican las entidades de base de datos existentes y las adaptaciones necesarias:

| Concepto de Negocio | Modelo Prisma / Tabla | Enums / Constraints | Campos Principales en BD | Estado / Adaptación Requerida |
| :--- | :--- | :--- | :--- | :--- |
| **Categorías Dinámicas** | `ComponentCategory`<br>`@@map("component_categories")` | `name` es `@unique` | `id`, `name`, `description`, `active`, `createdAt` | Alineado 1:1. Se mapea en `src/modules/categories/`. |
| **Catálogo Maestro** | `ProductCatalog`<br>`@@map("product_catalog")` | `sku` es `@unique`<br>`categoryId` FK | `id`, `sku`, `name`, `brand`, `model`, `categoryId`, `processor`, `ramCapacity`, `storageCapacity`, `gpu`, `screenSize`, `isSerialized`, `minStockThreshold`, `basePrice`, `isSecondHand`, `createdAt` | **Ajuste Requerido:** Agregar campo `active Boolean @default(true)` para dar cumplimiento a la regla constitucional de **Soft Delete** y filtros requeridos en el spec. |
| **Inventario Serializado** | `HardwareItem`<br>`@@map("hardware_items")` | `serialNumber` es `@unique`<br>Relación `LaptopComponents` | `id`, `serialNumber`, `catalogId`, `locationId`, `status`, `parentChassisId`, `costPrice`, `salePrice`, `createdAt`, `updatedAt` | Alineado. Mapear `parentChassisId` como la relación jerárquica padre-hijo (laptop chasis padre $\leftrightarrow$ componentes hijos acoplados). |
| **Estados de Ítem** | `enum ItemStatus` | Valores en BD:<br>`EN_STOCK`, `VENDIDO`, `SEGUNDA_MANO_PENDIENTE`, `EN_GARANTIA`, `DE_BAJA` | Utilizado por `HardwareItem.status` | Alineado. El estado `DE_BAJA` satisface el requerimiento de decommission/anulación. |
| **Ingreso por Lotes** | Transaccional en `HardwareItem` | Operación atómica vía `TransactionManagerPort` | Inserción en lote registrando `BATCH_INBOUND_HARDWARE` en `AuditLog` | No requiere tabla extra en BD; se procesa de forma transaccional garantizando consistencia padre-hijo. |
| **Inventario por Cantidad** | `QuantityStock`<br>`@@map("quantity_stocks")` | Relación con `catalog` y `location` | `id`, `catalogId`, `locationId`, `quantity`, `costPrice`, `salePrice`, `updatedAt` | **Ajuste Requerido:** Agregar constraint `@@unique([catalogId, locationId])` para garantizar unicidad por producto y ubicación, permitiendo operaciones atómicas de upsert e incremento/decremento. |

### Modificaciones Requeridas en `prisma/schema.prisma`
1. En `model ProductCatalog`:
   ```prisma
   model ProductCatalog {
     // ... campos existentes ...
     isSecondHand         Boolean                    @default(false)
     active               Boolean                    @default(true) // <-- Agregado para Soft Delete y filtros
     createdAt            DateTime                   @default(now())
     // ... relaciones ...
   }
   ```
2. En `model QuantityStock`:
   ```prisma
   model QuantityStock {
     id            String         @id @default(uuid())
     catalogId     String
     locationId    String
     quantity      Int            @default(0)
     costPrice     Decimal?       @db.Decimal(10, 2)
     salePrice     Decimal?       @db.Decimal(10, 2)
     updatedAt     DateTime       @updatedAt

     catalog       ProductCatalog @relation(fields: [catalogId], references: [id])
     location      Location       @relation(fields: [locationId], references: [id])

     saleItems     SaleItem[]
     transferItems TransferItem[]

     @@unique([catalogId, locationId]) // <-- Clave compuesta única para control de stock
     @@map("quantity_stocks")
   }
   ```

---

## 3. Estructura Hexagonal Detallada por Módulo

### 3.1 Módulo: Categorías Dinámicas (`src/modules/categories/`)

#### Capa de Dominio (`domain/`)
- **Entidades:** `src/modules/categories/domain/entities/category.entity.ts`
  - Propiedades: `id`, `name`, `description`, `active`, `createdAt`.
  - Invariantes de negocio: Validación de formato de nombre no vacío, normalización en mayúsculas/trim, método `deactivate()` para borrado lógico.
- **Puertos de Salida:** `src/modules/categories/domain/ports/out/category-repository.port.ts`
  - Símbolo: `export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');`
  - Métodos:
    - `save(category: CategoryEntity): Promise<CategoryEntity>`
    - `findById(id: string): Promise<CategoryEntity | null>`
    - `findByName(name: string): Promise<CategoryEntity | null>`
    - `findAll(filter?: { active?: boolean }): Promise<(CategoryEntity & { productsCount: number })[]>`
    - `update(category: CategoryEntity): Promise<CategoryEntity>`

#### Capa de Aplicación (`application/`)
- **DTOs Puros:**
  - `create-category-command.dto.ts`: `{ name: string; description?: string }`
  - `update-category-command.dto.ts`: `{ name?: string; description?: string; active?: boolean }`
  - `category-response.dto.ts`: `{ id: string; name: string; description: string | null; active: boolean; productsCount?: number; createdAt: Date }`
- **Casos de Uso:**
  - `CreateCategoryUseCase`: Valida unicidad de nombre (case-insensitive); si ya existe lanza `ConflictException` (409). Guarda la categoría y registra en bitácora `CREATE_CATEGORY` mediante `AuditLogPort`.
  - `GetCategoriesUseCase`: Lista categorías aplicando filtro opcional `?active=true` e incluye conteo de productos asociados.
  - `UpdateCategoryUseCase`: Valida existencia por ID; si cambia el nombre verifica que no colisione con otra categoría activa. Actualiza y registra `UPDATE_CATEGORY` en `AuditLogPort`.

#### Capa de Infraestructura (`infrastructure/`)
- **Adaptadores HTTP:**
  - `dto/create-category.http-dto.ts` y `dto/update-category.http-dto.ts`: Con validadores `class-validator` y decoradores `@ApiProperty()` de Swagger.
  - `categories.controller.ts`:
    - `POST /categories` (`ADMIN`): Invoca `CreateCategoryUseCase`.
    - `GET /categories` (`ADMIN`, `VENDEDOR`, `TECNICO`): Invoca `GetCategoriesUseCase`.
    - `PATCH /categories/:id` (`ADMIN`): Valida `:id` con `new ParseUUIDPipe({ version: '4' })`, invoca `UpdateCategoryUseCase`.
- **Adaptadores de Persistencia:**
  - `category.mapper.ts`: Mapeo bidireccional entre `ComponentCategory` (Prisma) y `CategoryEntity` (Dominio).
  - `prisma-category.repository.ts`: Implementa `CategoryRepositoryPort` consultando la tabla `component_categories`.
- **Configuración del Módulo:** `categories.module.ts`:
  - Registra `{ provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository }`.
  - Exporta: `CATEGORY_REPOSITORY`, `CreateCategoryUseCase`, `GetCategoriesUseCase`.

---

### 3.2 Módulo: Catálogo Maestro (`src/modules/catalog/`)

#### Capa de Dominio (`domain/`)
- **Entidades:** `src/modules/catalog/domain/entities/catalog-item.entity.ts`
  - Propiedades: `id`, `sku`, `name`, `brand`, `model`, `categoryId`, `processor`, `ramCapacity`, `storageCapacity`, `gpu`, `screenSize`, `isSerialized`, `minStockThreshold`, `basePrice`, `isSecondHand`, `active`, `createdAt`.
  - Invariantes: Validación de SKU único, precio base mayor o igual a 0, umbral de stock mínimo no negativo, método `deactivate()`.
- **Puertos de Salida:** `src/modules/catalog/domain/ports/out/catalog-repository.port.ts`
  - Símbolo: `export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');`
  - Métodos:
    - `save(item: CatalogItemEntity): Promise<CatalogItemEntity>`
    - `findById(id: string): Promise<CatalogItemEntity | null>`
    - `findBySku(sku: string): Promise<CatalogItemEntity | null>`
    - `findAll(options: CatalogFilterOptions): Promise<{ items: CatalogItemEntity[]; total: number }>`
    - `findDetailWithStockSummary(id: string): Promise<(CatalogItemEntity & { stockSummary: LocationStockSummary[] }) | null>`
    - `update(item: CatalogItemEntity): Promise<CatalogItemEntity>`

#### Capa de Aplicación (`application/`)
- **DTOs Puros:**
  - `create-catalog-item-command.dto.ts`
  - `update-catalog-item-command.dto.ts`
  - `create-pass-through-catalog-model-command.dto.ts`
  - `catalog-item-response.dto.ts`
  - `catalog-detail-response.dto.ts` (con stock desglosado por `Almacén Central` y puestos).
- **Casos de Uso:**
  - `CreateCatalogItemUseCase`: Valida que `categoryId` exista y esté activa (consultando `CategoryRepositoryPort`). Valida unicidad de `sku`. Persiste el producto maestro y registra `CREATE_CATALOG_ITEM` en `AuditLogPort`.
  - `GetCatalogItemsUseCase`: Lista paginada con filtros por `categoryId`, `active` y término de búsqueda `search` (coincidencia en SKU, nombre, marca o modelo).
  - `GetCatalogItemDetailUseCase`: Retorna la ficha técnica completa del ítem maestro y calcula el stock actual agrupado por ubicación (`locationId`, `locationName`, `locationType`, cantidad de ítems serializados en stock y unidades de stock cuantitativo).
  - `UpdateCatalogItemUseCase`: Modifica ficha técnica, precios, umbrales o estado `active` (soft delete) y emite `UPDATE_CATALOG_ITEM` en bitácora.
  - `CreatePassThroughCatalogModelUseCase` (**Exportable para M5 - Pases**): Crea un registro maestro en catálogo para productos ingresados por pase que requieran formalización, inicializando su stock físico en 0 para evitar inventario fantasma.

#### Capa de Infraestructura (`infrastructure/`)
- **Adaptadores HTTP:**
  - `dto/create-catalog-item.http-dto.ts`, `dto/update-catalog-item.http-dto.ts`, `dto/query-catalog.http-dto.ts`.
  - `catalog.controller.ts`:
    - `POST /catalog` (`ADMIN`)
    - `GET /catalog` (`ADMIN`, `VENDEDOR`, `TECNICO`)
    - `GET /catalog/:id` (`ADMIN`, `VENDEDOR`, `TECNICO`) con `ParseUUIDPipe`
    - `PATCH /catalog/:id` (`ADMIN`) con `ParseUUIDPipe`
- **Adaptadores de Persistencia:**
  - `catalog.mapper.ts`: Mapeo entre `ProductCatalog` (Prisma) y `CatalogItemEntity` (Dominio).
  - `prisma-catalog.repository.ts`: Implementa `CatalogRepositoryPort`.
- **Configuración del Módulo:** `catalog.module.ts`:
  - Importa `CategoriesModule` para verificar categorías sin romper encapsulamiento.
  - Registra `{ provide: CATALOG_REPOSITORY, useClass: PrismaCatalogRepository }`.
  - Exporta: `CATALOG_REPOSITORY`, `CreatePassThroughCatalogModelUseCase`, `GetCatalogItemDetailUseCase`.

---

### 3.3 Módulo: Inventario Serializado y Lotes (`src/modules/hardware-items/`)

#### Capa de Dominio (`domain/`)
- **Entidades y Agregados:** `src/modules/hardware-items/domain/entities/hardware-item.entity.ts`
  - Propiedades: `id`, `serialNumber`, `catalogId`, `locationId`, `status` (`ItemStatus`), `parentChassisId`, `costPrice`, `salePrice`, `createdAt`, `updatedAt`, `components?: HardwareItemEntity[]`, `parent?: HardwareItemEntity`.
  - Invariantes y Métodos de Negocio:
    - `attachChild(child: HardwareItemEntity)`:
      - Regla 1: Un ítem no puede ser hijo de sí mismo (`child.id !== this.id`).
      - Regla 2: Prevención de ciclos (`this.parentChassisId !== child.id`).
      - Regla 3: Padre e hijo deben encontrarse en la misma ubicación física (`child.locationId === this.locationId`).
      - Regla 4: Ambos ítems deben estar en estado disponible `ItemStatus.EN_STOCK`.
      - Regla 5: El hijo no debe tener ya otro padre asignado (`child.parentChassisId === null`).
    - `detachChild(child: HardwareItemEntity)`:
      - Valida que `child.parentChassisId === this.id`.
      - Asigna `child.parentChassisId = null` dejándolo disponible en la misma ubicación.
    - `decommission(reason: string)`:
      - Valida que el ítem no haya sido vendido (`this.status !== ItemStatus.VENDIDO`).
      - Asigna `this.status = ItemStatus.DE_BAJA`.
- **Value Objects:**
  - `barcode-label.vo.ts`: Genera y encapsula la estructura para etiquetas térmicas 1D Code 128 (`barcodeValue`, `title`, `specsSummary`, `locationName`, `price`).
- **Puertos de Salida:**
  - `hardware-item-repository.port.ts`:
    - Símbolo: `export const HARDWARE_ITEM_REPOSITORY = Symbol('HARDWARE_ITEM_REPOSITORY');`
    - Métodos:
      - `save(item: HardwareItemEntity): Promise<HardwareItemEntity>`
      - `saveMany(items: HardwareItemEntity[]): Promise<HardwareItemEntity[]>`
      - `findById(id: string, includeRelations?: { parent?: boolean; components?: boolean }): Promise<HardwareItemEntity | null>`
      - `findBySerialNumber(serial: string): Promise<HardwareItemEntity | null>`
      - `findExistingSerials(serials: string[]): Promise<string[]>`
      - `findAll(filters: HardwareItemFilterOptions): Promise<{ items: HardwareItemEntity[]; total: number }>`
      - `update(item: HardwareItemEntity): Promise<HardwareItemEntity>`
      - `updateMany(items: HardwareItemEntity[]): Promise<void>`
  - `serial-generator.port.ts`:
    - Símbolo: `export const SERIAL_GENERATOR_PORT = Symbol('SERIAL_GENERATOR_PORT');`
    - Método: `generateInternalSerial(): string` (formato estándar `MP-YYYYMMDD-XXXXXX`).

#### Capa de Aplicación (`application/`)
- **DTOs Puros:**
  - `batch-inbound-hardware-command.dto.ts` (estructura anidada de laptops con componentes RAM, SSD, batería, cargador e ítems sueltos).
  - `create-hardware-item-command.dto.ts`
  - `validate-serials-command.dto.ts`
  - `decommission-hardware-command.dto.ts`
  - `barcode-label-response.dto.ts`
  - `hardware-lifecycle-response.dto.ts`
- **Casos de Uso:**
  - `BatchInboundHardwareUseCase`: Ejecutado en una única transacción atómica (`TransactionManagerPort`). Valida la ubicación, verifica que los modelos de catálogo pertenezcan a productos serializados (`isSerialized: true`), genera códigos `MP-...` para piezas sin serie, crea el chasis padre y sus componentes hijos vinculando sus IDs, y registra `BATCH_INBOUND_HARDWARE` en `AuditLogPort`.
  - `CreateHardwareItemUseCase`: Alta individual de ítem con `parentChassisId` opcional, validación de serie única o generación automática y registro de `CREATE_HARDWARE_ITEM`.
  - `ValidateSerialsUseCase`: Recibe un arreglo `{ serialNumbers: string[] }` y consulta de forma ultrarrápida cuáles ya existen en la base de datos para soporte del escaneo en vivo del Admin.
  - `GetHardwareItemsUseCase`: Lista paginada con filtros por `locationId`, `categoryId`, `catalogItemId`, `status`, `condition` (nuevo/usado mediante catálogo), `search` y `onlyParents=true`.
  - `ScanHardwareItemUseCase` (**Scanner-First**): Busca por `serialNumber` o código interno; retorna el ítem, su ubicación actual, sus componentes hijos (si es laptop) o su chasis padre (si es componente instalado).
  - `GetHardwareItemDetailUseCase`: Detalle completo con información de producto de catálogo, ubicación, chasis y componentes.
  - `GetHardwareLifecycleUseCase` (**Hoja de Vida M6**): Reconstruye la cronología completa de auditoría y movimientos consultando `AuditLogPort` por el ID del ítem y su número de serie.
  - `GetBarcodeLabelUseCase`: Retorna el payload formateado para impresión térmica 1D y registra `PRINT_BARCODE_LABEL`.
  - `GetBatchBarcodeLabelsUseCase`: Retorna arreglo de etiquetas para lote de ítems y registra `PRINT_BARCODE_LABELS_BATCH`.
  - `UpdateHardwareItemUseCase`: Actualiza precios y especificaciones operativas, registrando `UPDATE_HARDWARE_ITEM`.
  - `DecommissionHardwareItemUseCase`: Da de baja lógica (`DE_BAJA`) con motivo obligatorio `reason`, validando que no esté vendido, y registra `DECOMMISSION_HARDWARE_ITEM`.
  - `AttachHardwareChildUseCase` (**Exportable para M2 y M3**): Acopla un componente a un equipo padre validando invariantes y registrando `ATTACH_HARDWARE_CHILD`.
  - `DetachHardwareChildUseCase` (**Exportable para M2 y M3**): Desacopla un componente hijo y registra `DETACH_HARDWARE_CHILD`.
  - `ApproveUsedComponentUseCase` (**Exportable para M5**): Incorpora al inventario de usados un componente extraído en upgrade con estado `EN_STOCK`, asigna ubicación y genera etiqueta de barra.

#### Capa de Infraestructura (`infrastructure/`)
- **Adaptadores HTTP:**
  - `hardware-items.controller.ts`:
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
- **Adaptadores de Persistencia y Generadores:**
  - `hardware-item.mapper.ts`: Mapeo entre `HardwareItem` (Prisma) y `HardwareItemEntity` (Dominio).
  - `prisma-hardware-item.repository.ts`: Implementa `HardwareItemRepositoryPort`.
  - `crypto-serial-generator.adapter.ts`: Implementa `SerialGeneratorPort` generando códigos `MP-YYYYMMDD-XXXXXX`.
- **Configuración del Módulo:** `hardware-items.module.ts`:
  - Enlaza `HARDWARE_ITEM_REPOSITORY`, `SERIAL_GENERATOR_PORT`.
  - Importa `CatalogModule` y `LocationsModule`.
  - Exporta:
    - `HARDWARE_ITEM_REPOSITORY`
    - `AttachHardwareChildUseCase`
    - `DetachHardwareChildUseCase`
    - `ApproveUsedComponentUseCase`
    - `GetHardwareItemDetailUseCase`
    - `ScanHardwareItemUseCase`

---

### 3.4 Módulo: Inventario por Cantidad (`src/modules/quantity-stock/`)

#### Capa de Dominio (`domain/`)
- **Entidades:** `src/modules/quantity-stock/domain/entities/quantity-stock.entity.ts`
  - Propiedades: `id`, `catalogId`, `locationId`, `quantity`, `costPrice`, `salePrice`, `updatedAt`.
  - Invariantes de negocio:
    - La cantidad física nunca puede ser inferior a 0 (`quantity >= 0`).
    - `increase(amount: number, newCostPrice?: number, newSalePrice?: number)`: Incrementa existencia física y actualiza precios de reposición si aplican.
    - `decrease(amount: number)`: Descuenta existencias físicas; si `amount > this.quantity` arroja error de dominio por stock insuficiente.
    - `adjust(newQuantity: number, reason: string)`: Ajuste manual absoluto verificando que `newQuantity >= 0`.
- **Puertos de Salida:** `src/modules/quantity-stock/domain/ports/out/quantity-stock-repository.port.ts`
  - Símbolo: `export const QUANTITY_STOCK_REPOSITORY = Symbol('QUANTITY_STOCK_REPOSITORY');`
  - Métodos:
    - `save(stock: QuantityStockEntity): Promise<QuantityStockEntity>`
    - `findByCatalogAndLocation(catalogId: string, locationId: string): Promise<QuantityStockEntity | null>`
    - `findById(id: string): Promise<QuantityStockEntity | null>`
    - `findAll(filter: QuantityStockFilterOptions): Promise<{ items: QuantityStockEntity[]; total: number }>`
    - `update(stock: QuantityStockEntity): Promise<QuantityStockEntity>`

#### Capa de Aplicación (`application/`)
- **DTOs Puros:**
  - `inbound-quantity-stock-command.dto.ts`
  - `adjust-quantity-stock-command.dto.ts`
  - `decrease-quantity-stock-command.dto.ts` (para consumo de Ventas/Traslados)
  - `quantity-stock-response.dto.ts`
- **Casos de Uso:**
  - `InboundQuantityStockUseCase`: Ingreso de mercadería no serializada. Realiza upsert por la clave `(catalogId, locationId)`, suma la cantidad ingresada, actualiza precios referenciales y registra `INBOUND_QUANTITY_STOCK` en bitácora.
  - `AdjustQuantityStockUseCase`: Ajuste manual por inventario físico o merma. Valida motivo `reason` obligatorio, actualiza saldo y registra `ADJUST_QUANTITY_STOCK` en bitácora con saldo anterior, nuevo saldo y motivo.
  - `DecreaseQuantityStockUseCase` (**Exportable para M2 Ventas y M3 Traslados**): Reduce stock físico asegurando que nunca resulte en números negativos.
  - `GetQuantityStocksUseCase`: Lista inventario cuantitativo con filtros por `locationId`, `categoryId`, `catalogItemId` y bandera `lowStock=true` (comparando contra el umbral `minStockThreshold` del catálogo).

#### Capa de Infraestructura (`infrastructure/`)
- **Adaptadores HTTP:**
  - `dto/inbound-quantity-stock.http-dto.ts`, `dto/adjust-quantity-stock.http-dto.ts`, `dto/query-quantity-stock.http-dto.ts`.
  - `quantity-stock.controller.ts`:
    - `POST /quantity-stock/inbound` (`ADMIN`)
    - `PATCH /quantity-stock/adjust` (`ADMIN`)
    - `GET /quantity-stock` (`ADMIN`, `VENDEDOR`, `TECNICO`)
- **Adaptadores de Persistencia:**
  - `quantity-stock.mapper.ts`: Mapeo entre `QuantityStock` (Prisma) y `QuantityStockEntity` (Dominio).
  - `prisma-quantity-stock.repository.ts`: Implementa `QuantityStockRepositoryPort` con operaciones upsert y bloqueos seguros.
- **Configuración del Módulo:** `quantity-stock.module.ts`:
  - Registra `{ provide: QUANTITY_STOCK_REPOSITORY, useClass: PrismaQuantityStockRepository }`.
  - Importa `CatalogModule` y `LocationsModule`.
  - Exporta:
    - `QUANTITY_STOCK_REPOSITORY`
    - `InboundQuantityStockUseCase`
    - `DecreaseQuantityStockUseCase`
    - `AdjustQuantityStockUseCase`

---

## 4. Matriz de Casos de Uso Exportados para Integración Intermodular

Para dar cumplimiento a la arquitectura modular sin generar dependencias circulares ni fuga de repositorios:

| Módulo Emisor | Caso de Uso / Puerto Exportado | Módulo Consumidor (Fases Futuras) | Propósito de Integración |
| :--- | :--- | :--- | :--- |
| `CatalogModule` | `CreatePassThroughCatalogModelUseCase` | M5 (Pases y Segunda Mano) | Creación automática de ficha de catálogo para productos de pase aprobados con stock físico en 0. |
| `CatalogModule` | `GetCatalogItemDetailUseCase` | M2 (Ventas / POS) | Consulta de ficha técnica y stock disponible por ubicación al cotizar o vender. |
| `HardwareItemsModule` | `AttachHardwareChildUseCase` | M2 (Ventas) / M7 (Servicio Técnico) | Acoplamiento de memorias/SSD adicionales a una laptop vendida con upgrade en el POS o taller. |
| `HardwareItemsModule` | `DetachHardwareChildUseCase` | M2 (Ventas) / M7 (Servicio Técnico) | Despiece de componentes para upgrades o reemplazos por garantía. |
| `HardwareItemsModule` | `ApproveUsedComponentUseCase` | M5 (Segunda Mano) | Incorporación formal al inventario de piezas usadas extraídas tras upgrade. |
| `HardwareItemsModule` | `ScanHardwareItemUseCase` | M2 (POS) / M3 (Logística) / M4 (Auditoría) | Búsqueda scanner-first ultrarrápida al pistolear productos en mostradores. |
| `QuantityStockModule` | `DecreaseQuantityStockUseCase` | M2 (Ventas) / M3 (Traslados) | Descuento automático de existencias físicas para accesorios vendidos o trasladados. |
| `QuantityStockModule` | `InboundQuantityStockUseCase` | M3 (Traslados) | Recepción de mercadería transferida entre puestos. |

---

## 5. Seguridad, RBAC y Auditoría Global (M6)

### Control de Acceso por Roles (RBAC)
- Todas las rutas están protegidas por defecto con `JwtAuthGuard` y `RolesGuard`.
- **Matriz de Permisos:**
  - `POST /categories`, `PATCH /categories/:id`: Exclusivo `ADMIN`.
  - `POST /catalog`, `PATCH /catalog/:id`: Exclusivo `ADMIN`.
  - `POST /hardware-items/batch-inbound`, `POST /hardware-items`, `PATCH /hardware-items/:id`, `PATCH /hardware-items/:id/decommission`, `POST /hardware-items/:id/children`, `DELETE /hardware-items/:id/children/:childId`: Exclusivo `ADMIN`.
  - `POST /quantity-stock/inbound`, `PATCH /quantity-stock/adjust`: Exclusivo `ADMIN`.
  - `GET /categories`, `GET /catalog`, `GET /catalog/:id`, `GET /hardware-items`, `GET /hardware-items/scan/:code`, `GET /hardware-items/:id`, `GET /hardware-items/:id/lifecycle`, `GET /hardware-items/:id/barcode-label`, `POST /hardware-items/barcode-labels/batch`, `GET /quantity-stock`: Accesibles para `ADMIN`, `VENDEDOR` y `TECNICO`.

### Registro de Eventos en Bitácora (`AuditLogPort`)
Toda mutación y acción crítica emite de forma asíncrona un evento a la bitácora inalterable:
- `CREATE_CATEGORY`, `UPDATE_CATEGORY`
- `CREATE_CATALOG_ITEM`, `UPDATE_CATALOG_ITEM`
- `BATCH_INBOUND_HARDWARE`, `CREATE_HARDWARE_ITEM`, `UPDATE_HARDWARE_ITEM`, `DECOMMISSION_HARDWARE_ITEM`
- `ATTACH_HARDWARE_CHILD`, `DETACH_HARDWARE_CHILD`
- `PRINT_BARCODE_LABEL`, `PRINT_BARCODE_LABELS_BATCH`
- `INBOUND_QUANTITY_STOCK`, `ADJUST_QUANTITY_STOCK`

---

## 6. Árbol Completo de Archivos a Crear en `src/`

```
src/
├── modules/
│   ├── categories/
│   │   ├── categories.module.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── category.entity.ts
│   │   │   └── ports/
│   │   │       └── out/
│   │   │           └── category-repository.port.ts
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── create-category-command.dto.ts
│   │   │   │   ├── update-category-command.dto.ts
│   │   │   │   └── category-response.dto.ts
│   │   │   └── use-cases/
│   │   │       ├── create-category.use-case.ts
│   │   │       ├── get-categories.use-case.ts
│   │   │       └── update-category.use-case.ts
│   │   └── infrastructure/
│   │       ├── adapters/
│   │       │   ├── in/
│   │       │   │   └── http/
│   │       │   │       ├── categories.controller.ts
│   │       │   │       └── dto/
│   │       │   │           ├── create-category.http-dto.ts
│   │       │   │           └── update-category.http-dto.ts
│   │       │   └── out/
│   │       │       └── persistence/
│   │       │           ├── category.mapper.ts
│   │       │           └── prisma-category.repository.ts
│   │
│   ├── catalog/
│   │   ├── catalog.module.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── catalog-item.entity.ts
│   │   │   └── ports/
│   │   │       └── out/
│   │   │           └── catalog-repository.port.ts
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── create-catalog-item-command.dto.ts
│   │   │   │   ├── update-catalog-item-command.dto.ts
│   │   │   │   ├── create-pass-through-catalog-model-command.dto.ts
│   │   │   │   ├── catalog-item-response.dto.ts
│   │   │   │   └── catalog-detail-response.dto.ts
│   │   │   └── use-cases/
│   │   │       ├── create-catalog-item.use-case.ts
│   │   │       ├── get-catalog-items.use-case.ts
│   │   │       ├── get-catalog-item-detail.use-case.ts
│   │   │       ├── update-catalog-item.use-case.ts
│   │   │       └── create-pass-through-catalog-model.use-case.ts
│   │   └── infrastructure/
│   │       ├── adapters/
│   │       │   ├── in/
│   │       │   │   └── http/
│   │       │   │       ├── catalog.controller.ts
│   │       │   │       └── dto/
│   │       │   │           ├── create-catalog-item.http-dto.ts
│   │       │   │           ├── update-catalog-item.http-dto.ts
│   │       │   │           └── query-catalog.http-dto.ts
│   │       │   └── out/
│   │       │       └── persistence/
│   │       │           ├── catalog.mapper.ts
│   │       │           └── prisma-catalog.repository.ts
│   │
│   ├── hardware-items/
│   │   ├── hardware-items.module.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── hardware-item.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   └── barcode-label.vo.ts
│   │   │   └── ports/
│   │   │       └── out/
│   │   │           ├── hardware-item-repository.port.ts
│   │   │           └── serial-generator.port.ts
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── batch-inbound-hardware-command.dto.ts
│   │   │   │   ├── create-hardware-item-command.dto.ts
│   │   │   │   ├── validate-serials-command.dto.ts
│   │   │   │   ├── decommission-hardware-command.dto.ts
│   │   │   │   ├── barcode-label-response.dto.ts
│   │   │   │   ├── hardware-lifecycle-response.dto.ts
│   │   │   │   └── hardware-item-response.dto.ts
│   │   │   └── use-cases/
│   │   │       ├── batch-inbound-hardware.use-case.ts
│   │   │       ├── create-hardware-item.use-case.ts
│   │   │       ├── validate-serials.use-case.ts
│   │   │       ├── get-hardware-items.use-case.ts
│   │   │       ├── scan-hardware-item.use-case.ts
│   │   │       ├── get-hardware-item-detail.use-case.ts
│   │   │       ├── get-hardware-lifecycle.use-case.ts
│   │   │       ├── get-barcode-label.use-case.ts
│   │   │       ├── get-batch-barcode-labels.use-case.ts
│   │   │       ├── update-hardware-item.use-case.ts
│   │   │       ├── decommission-hardware-item.use-case.ts
│   │   │       ├── attach-hardware-child.use-case.ts
│   │   │       ├── detach-hardware-child.use-case.ts
│   │   │       └── approve-used-component.use-case.ts
│   │   └── infrastructure/
│   │       ├── adapters/
│   │       │   ├── in/
│   │       │   │   └── http/
│   │       │   │       ├── hardware-items.controller.ts
│   │       │   │       └── dto/
│   │       │   │           ├── batch-inbound-hardware.http-dto.ts
│   │       │   │           ├── create-hardware-item.http-dto.ts
│   │       │   │           ├── validate-serials.http-dto.ts
│   │       │   │           ├── decommission-hardware.http-dto.ts
│   │       │   │           ├── attach-child.http-dto.ts
│   │       │   │           ├── update-hardware-item.http-dto.ts
│   │       │   │           └── query-hardware-items.http-dto.ts
│   │       │   └── out/
│   │       │       ├── persistence/
│   │       │       │   ├── hardware-item.mapper.ts
│   │       │       │   └── prisma-hardware-item.repository.ts
│   │       │       └── generator/
│   │       │           └── crypto-serial-generator.adapter.ts
│   │
│   └── quantity-stock/
│       ├── quantity-stock.module.ts
│       ├── domain/
│       │   ├── entities/
│       │   │   └── quantity-stock.entity.ts
│       │   └── ports/
│       │       └── out/
│       │           └── quantity-stock-repository.port.ts
│       ├── application/
│       │   ├── dto/
│       │   │   ├── inbound-quantity-stock-command.dto.ts
│       │   │   ├── adjust-quantity-stock-command.dto.ts
│       │   │   ├── decrease-quantity-stock-command.dto.ts
│       │   │   └── quantity-stock-response.dto.ts
│       │   └── use-cases/
│       │       ├── inbound-quantity-stock.use-case.ts
│       │       ├── adjust-quantity-stock.use-case.ts
│       │       ├── decrease-quantity-stock.use-case.ts
│       │       └── get-quantity-stocks.use-case.ts
│       └── infrastructure/
│           ├── adapters/
│           │   ├── in/
│           │   │   └── http/
│           │   │       ├── quantity-stock.controller.ts
│           │   │       └── dto/
│           │   │           ├── inbound-quantity-stock.http-dto.ts
│           │   │           ├── adjust-quantity-stock.http-dto.ts
│           │   │           └── query-quantity-stock.http-dto.ts
│           │   └── out/
│           │       └── persistence/
│           │           ├── quantity-stock.mapper.ts
│           │           └── prisma-quantity-stock.repository.ts
```
