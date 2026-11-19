# Especificación Fase 1: Categorías, Catálogo Maestro, Lotes, Inventario (Serializado/Cantidad) y Trazabilidad

## Objetivo
Implementar el núcleo completo del Módulo de Inventario (M1) y la Hoja de Vida de Hardware (M6) de "Mundo Portátil", respetando estrictamente la **Arquitectura Monolito Modular Hexagonal** (`specs/CONSTITUTION.md`), la matriz de permisos estricta (solo `ADMIN` modifica inventario; `VENDEDOR` y `TECNICO` solo consultan e imprimen/reimprimen etiquetas 1D) y alineándose 1:1 con `prisma/schema.prisma`.

## Regla de Alineación con `prisma/schema.prisma`
Antes de generar el `plan.md`, inspeccionar `prisma/schema.prisma` para mapear exactamente los nombres de tablas, relaciones y enums existentes para:
- Categorías (`Category` o equivalente)
- Catálogo maestro (`CatalogItem` / `ProductCatalog` o equivalente)
- Lotes de ingreso (adaptar al esquema existente en `schema.prisma` sin romper tablas sincronizadas)
- Ítems serializados (`HardwareItem` con relación Padre-Hijo y soporte de condición/estado)
- Stock por cantidad (`QuantityStock` o equivalente)

---

## Requerimientos por Módulo

### 1. CategoriesModule (`src/modules/categories/`) — Categorías Dinámicas
- **Reglas de Negocio:**
  - Clasifica los productos (Laptops, RAM, SSD, Baterías, Cargadores, Accesorios) y define su tipo de seguimiento (Serializado vs. Por Cantidad) y plantilla de especificaciones si el esquema lo contempla.
  - Validar unicidad de nombre (case-insensitive, retornar `409 Conflict` si ya existe).
  - Eliminación lógica (`active: false`).
- **Endpoints:**
  - `POST /categories` (`ADMIN`): Crea categoría y registra `CREATE_CATEGORY` en `AuditLogPort`.
  - `GET /categories` (`ADMIN`, `VENDEDOR`, `TECNICO`): Lista categorías con filtro opcional `?active=true` y conteo de productos asociados.
  - `PATCH /categories/:id` (`ADMIN`): Valida UUID, actualiza datos o `active` y registra `UPDATE_CATEGORY` en bitácora.

### 2. CatalogModule (`src/modules/catalog/`) — Catálogo Maestro de Productos
- **Reglas de Negocio:**
  - Ficha maestra (marca, modelo, especificaciones técnicas, precios referenciales, categoría asociada).
  - Validar que `categoryId` exista y esté activa.
  - Eliminación lógica (`active: false`).
  - **Caso de Uso Exportable para M5 (Pases):** `CreatePassThroughCatalogModelUseCase` — permite crear un registro maestro en el catálogo a partir de un producto por pase aprobado en M5 dejando su stock físico en `0` (evita inventario fantasma y habilita garantías/reposiciones).
- **Endpoints:**
  - `POST /catalog` (`ADMIN`): Registra producto maestro y emite `CREATE_CATALOG_ITEM` en bitácora.
  - `GET /catalog` (`ADMIN`, `VENDEDOR`, `TECNICO`): Lista paginada con filtros por `categoryId`, `active` y búsqueda (`search` por marca/modelo/código).
  - `GET /catalog/:id` (`ADMIN`, `VENDEDOR`, `TECNICO`): Detalle del producto maestro + resumen de stock disponible desglosado por ubicación (`Almacén Central` y cada `Puesto`).
  - `PATCH /catalog/:id` (`ADMIN`): Edita especificaciones, precios o estado `active` y registra `UPDATE_CATALOG_ITEM`.

### 3. HardwareItemsModule (`src/modules/hardware-items/`) — Inventario Serializado, Lotes, Etiquetas 1D y Padre-Hijo
- **Reglas de Negocio:**
  - **Códigos de Barras / Series:** Si un ítem (ej. cargador, batería o pieza suelta) ingresa sin número de serie de fábrica, el dominio genera automáticamente un código interno único apto para Code 128 (ej. `MP-YYYYMMDD-XXXXXX`).
  - **Ingreso Masivo por Lotes:** Solo `ADMIN` registra en una sola transacción (`TransactionManagerPort`) un lote de equipos y componentes asignados a una ubicación inicial (`locationId`), permitiendo vincular en el mismo acto cada laptop (chasis padre) con sus componentes internos hijos (RAM, SSD, batería, cargador).
  - **Anulación / Baja de Lote o Ítem:** Solo `ADMIN` puede dar de baja o anular un lote/ítem registrado por error, siempre y cuando ningún ítem haya sido vendido o transferido.
  - **Relación Padre-Hijo (Ensamblaje y Despiece):**
    - `attach`: Un hijo no puede acoplarse a sí mismo ni crear ciclos; padre e hijo deben estar en la misma `locationId` y en estado disponible.
    - `detach`: Libera `parentId = null` dejando el componente disponible en la misma ubicación del padre.
    - **Nota:** Los endpoints HTTP de acople/despiece directo son exclusivos de `ADMIN`, pero los **Casos de Uso** (`AttachHardwareChildUseCase`, `DetachHardwareChildUseCase`) deben exportarse en `HardwareItemsModule` para que Ventas (Fase 2) y Servicio Técnico (Fase 3) puedan consumirlos internamente.
  - **Caso de Uso Exportable para M5 (Segunda Mano):** `ApproveUsedComponentUseCase` — incorpora formalmente al inventario de usados un componente retirado en upgrade tras aprobación de Admin, asignándole ubicación y generando su etiqueta 1D.
- **Endpoints:**
  - `POST /hardware-items/batch-inbound` (`ADMIN`): Ingreso masivo por lotes (alta múltiple de laptops con componentes hijos anidados e ítems sueltos en una sola transacción). Registra `BATCH_INBOUND_HARDWARE` en bitácora.
  - `POST /hardware-items` (`ADMIN`): Alta individual de un ítem serializado (con `parentId` opcional) y registro en bitácora `CREATE_HARDWARE_ITEM`.
  - `POST /hardware-items/validate-serials` (`ADMIN`): Endpoint de apoyo para el formulario de ingreso del Admin; recibe `{ serialNumbers: string[] }` y devuelve cuáles ya existen en la BD para validación en vivo al pistolear lotes.
  - `GET /hardware-items` (`ADMIN`, `VENDEDOR`, `TECNICO`): Lista paginada con filtros por `locationId`, `categoryId`, `catalogItemId`, `status`, `condition` (nuevo/usado), `search` (N/S o modelo) y `onlyParents=true` (incluye sus hijos acoplados).
  - `GET /hardware-items/scan/:code` (`ADMIN`, `VENDEDOR`, `TECNICO`): **Endpoint Scanner-First**. Busca por `serialNumber` o código interno; devuelve el ítem, su ubicación actual, sus hijos (si es laptop) o su equipo padre (si es una pieza instalada dentro de una laptop).
  - `GET /hardware-items/:id` (`ADMIN`, `VENDEDOR`, `TECNICO`): Detalle completo del hardware, padre e hijos acoplados.
  - `GET /hardware-items/:id/lifecycle` (`ADMIN`, `VENDEDOR`, `TECNICO`): **Hoja de Vida de Hardware (M6)**. Consulta la línea de tiempo completa de eventos de bitácora y movimientos asociados al ítem y su `serialNumber`.
  - `GET /hardware-items/:id/barcode-label` (`ADMIN`, `VENDEDOR`, `TECNICO`): Devuelve los datos formateados para impresión/reimpresión térmica 1D Code 128 (`barcodeValue`, `title`, `specsSummary`, `locationName`, `price`) y registra `PRINT_BARCODE_LABEL` en bitácora.
  - `POST /hardware-items/barcode-labels/batch` (`ADMIN`, `VENDEDOR`, `TECNICO`): Recibe `{ hardwareItemIds: string[] }` y devuelve el arreglo de etiquetas 1D listas para impresión/reimpresión masiva, registrando `PRINT_BARCODE_LABELS_BATCH` en bitácora.
  - `PATCH /hardware-items/:id` (`ADMIN`): Actualiza especificaciones, precio o estado operativo y registra `UPDATE_HARDWARE_ITEM` en bitácora.
  - `PATCH /hardware-items/:id/decommission` (`ADMIN`): Da de baja lógica un ítem (por error de registro o daño irreparable) con `reason` obligatorio, validando que no esté vendido, y registra `DECOMMISSION_HARDWARE_ITEM` en bitácora.
  - `POST /hardware-items/:id/children` (`ADMIN`): Acopla uno o varios componentes hijos (`childIds: string[]`) al equipo padre `:id` y registra `ATTACH_HARDWARE_CHILD`.
  - `DELETE /hardware-items/:id/children/:childId` (`ADMIN`): Desacopla un componente hijo del padre `:id` y registra `DETACH_HARDWARE_CHILD`.

### 4. QuantityStockModule (`src/modules/quantity-stock/`) — Inventario por Cantidad
- **Reglas de Negocio:**
  - Gestiona productos no serializados (accesorios, periféricos, consumibles) por clave única `(catalogItemId, locationId)`.
  - Nunca permitir stock resultante menor a `0`.
  - Exportar los casos de uso de incremento/decremento de stock para que Ventas (regalos/accesorios) y Traslados puedan consumirlos internamente.
- **Endpoints:**
  - `POST /quantity-stock/inbound` (`ADMIN`): Registra entrada de mercadería por cantidad en una ubicación (`upsert`), actualiza costo/precio referencial y registra `INBOUND_QUANTITY_STOCK` en bitácora.
  - `PATCH /quantity-stock/adjust` (`ADMIN`): Ajuste manual (positivo o negativo con `reason` obligatorio) y registro `ADJUST_QUANTITY_STOCK` con saldo anterior y nuevo.
  - `GET /quantity-stock` (`ADMIN`, `VENDEDOR`, `TECNICO`): Lista existencias filtradas por `locationId`, `categoryId`, `catalogItemId` y `lowStock=true`.

---

## Criterios de Aceptación de la Fase 1
1. Arquitectura Monolito Modular Hexagonal estricta (`domain/` y `application/` 100% libres de imports de Prisma o Swagger).
2. Matriz RBAC estricta: solo `ADMIN` puede mutar categorías, catálogo, hardware o stock; `VENDEDOR` y `TECNICO` solo acceden a consultas (`GET`) y emisión/reimpresión de etiquetas 1D.
3. Todos los `:id` validados con `ParseUUIDPipe` y todas las mutaciones (incluyendo impresiones de etiquetas) registradas vía `AuditLogPort`.
4. `npm run build` compila con **0 errores** de TypeScript.
5. Swagger (`/api`) documenta todos los endpoints y DTOs.
6. Actualizar `@specs/API_CONTRACTS.md` agregando toda la sección de la **Fase 1** con sus ejemplos JSON de petición y respuesta para el Frontend.