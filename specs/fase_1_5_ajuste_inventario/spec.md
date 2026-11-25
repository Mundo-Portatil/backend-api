```markdown
# Especificación Fase Intermedia (1.5): Inventario Unificado Sincronizado y Rol Encargado de Almacén

## 1. Objetivo
Refactorizar los módulos de la **Fase 0** (Roles/RBAC) y **Fase 1** (Categorías, Catálogo Maestro, Inventario Serializado e Inventario por Cantidad) para alinearlos con el flujo operativo real del almacén de **Mundo Portátil**, respetando estrictamente la **Arquitectura Monolito Modular Hexagonal** (`specs/CONSTITUTION.md`).

### Cambios Clave de Negocio
1. **Nuevo Rol `ENCARGADO_ALMACEN`:** Responsable del registro de mercadería entrante, mantenimiento de catálogo/categorías, aprobación de piezas de segunda mano y preparación de distribución hacia los puestos.
2. **Ingreso Directo al Almacén Central:** Todo ingreso de mercadería apunta automáticamente a la ubicación activa con `type: LocationType.ALMACEN_CENTRAL`. La distribución hacia cada `PUESTO` se realizará exclusivamente mediante movimientos de logística interna.
3. **Catálogo sin campo `name` y sin jerarquía Padre-Hijo:** Se elimina `name` de `ProductCatalog` (identificando cada producto por `brand` + `model` + `sku` + especificaciones técnicas). Ya no se vinculan componentes internos (`RAM`, `SSD`, `cargador`) con números de serie a una laptop padre durante el ingreso.
4. **Ingreso Unificado Sincronizado (`QuantityStock` + `HardwareItem`):**
   - `QuantityStock` almacena el **saldo físico total por `(catalogId, locationId)` para TODOS los productos** (tengan serie o no), garantizando que el umbral `minStockThreshold` y las alertas de stock mínimo funcionen de forma uniforme.
   - `HardwareItem` almacena el **registro detalle de cada `serialNumber`** vinculado a `catalogId` y `locationId` únicamente cuando el producto se ingresa con números de serie (`hasSerialNumbers: true`).
5. **Impresión Dual de Etiquetas Térmicas 1D (Code 128):**
   - **Por modelo / cantidad:** Imprime $N$ copias idénticas usando el `sku` del catálogo como código de barras.
   - **Por serie individual:** Imprime $N$ etiquetas distintas usando cada `serialNumber` único como código de barras.

---

## 2. Cambios en Base de Datos (`prisma/schema.prisma`)

1. **Agregar `ENCARGADO_ALMACEN` en `enum Role`:**
   ```prisma
   enum Role {
     ADMIN
     ENCARGADO_ALMACEN
     VENDEDOR
     TECNICO
   }
   ```

2. **Eliminar `name` en `model ProductCatalog`:**
   Remover el campo `name String` de `ProductCatalog`:
   ```prisma
   model ProductCatalog {
     id                   String                     @id @default(uuid())
     sku                  String                     @unique
     brand                String
     model                String
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
     // ... relaciones existentes ...
   }
   ```
   *Nota:* Si `sku` no es enviado al crear un producto maestro (`POST /catalog`), el dominio generará automáticamente uno único con formato `MP-CAT-XXXXXX` para garantizar que todo modelo tenga un código 1D imprimible.

3. **Preservación de Tablas para Integridad Intermodular:**
   - Mantener `HardwareItem` (con `parentChassisId` nullable sin uso operativo en Fase 1.5) y `QuantityStock` (`@@unique([catalogId, locationId])`) para conservar compatibilidad referencial con Ventas (`SaleItem`), Traslados (`TransferItem`), Servicio Técnico (`ServiceItem`) y Aprobaciones (`SecondHandApprovalQueue`).

---

## 3. Matriz de Permisos Actualizada (RBAC)

| Recurso / Operación | `ADMIN` | `ENCARGADO_ALMACEN` | `VENDEDOR` | `TECNICO` |
| :--- | :---: | :---: | :---: | :---: |
| Gestión de Usuarios y Bitácora Global (`/users`, `/audit-logs`) | Sí | No | No | No |
| Crear / Editar Categorías (`POST/PATCH /categories`) | Sí | Sí | No | No |
| Crear / Editar Catálogo (`POST/PATCH /catalog`) | Sí | Sí | No | No |
| Ingreso Unificado al Almacén (`POST /inventory/inbound`) | Sí | Sí | No | No |
| Validar Series / Ajustes / Bajas / Aprobar Usados | Sí | Sí | No | No |
| Consultar Categorías, Catálogo, Stock y Series Disponibles (`GET`) | Sí | Sí | Sí | Sí |
| Consultar Hoja de Vida de Hardware (`GET .../lifecycle`) | Sí | Sí | Sí | Sí |
| Imprimir / Reimprimir Etiquetas 1D (Modelo o Series) | Sí | Sí | Sí | Sí |

---

## 4. Requerimientos Funcionales por Módulo

### 4.1 `CategoriesModule` (`src/modules/categories/`)
- Habilitar acceso a `ADMIN` y `ENCARGADO_ALMACEN` en `POST /categories` y `PATCH /categories/:id`.
- Mantener acceso de lectura `GET /categories` para todos los roles autenticados.

### 4.2 `CatalogModule` (`src/modules/catalog/`)
- **Eliminación de `name`:** Quitar `name` de `CatalogItemEntity`, DTOs de aplicación/HTTP, `catalog.mapper.ts` y respuestas JSON.
- **Búsqueda (`GET /catalog?search=...`):** Buscar coincidencias case-insensitive en `sku`, `brand`, `model` y `processor`.
- **Auto-generación de `sku`:** Si `sku` llega vacío u omitido en `POST /catalog`, generar `MP-CAT-XXXXXX`; si se envía explícitamente, validar unicidad (`409 Conflict`).
- **Resumen de Stock (`GET /catalog/:id`):** Calcular `stockSummary` por ubicación directamente desde `QuantityStock` (dado que `QuantityStock` consolida el saldo total de todos los modelos, serializados o no).
- **RBAC:** Permitir `ADMIN` y `ENCARGADO_ALMACEN` en `POST /catalog` y `PATCH /catalog/:id`.

### 4.3 Flujo Unificado de Inventario (`Inventory` / `HardwareItems` / `QuantityStock`)

#### A. Ingreso Unificado Directo a Almacén Central (`POST /inventory/inbound`)
- **Roles Permitidos:** `ADMIN`, `ENCARGADO_ALMACEN`.
- **Resolución Automática de Ubicación:** El caso de uso busca la ubicación activa con `type === LocationType.ALMACEN_CENTRAL`. Si no existe un almacén central activo, responde `400 Bad Request`.
- **Payload de Entrada (soporta lotes mixtos de 1 o varios modelos en una transacción):**
  ```json
  {
    "items": [
      {
        "catalogId": "uuid-modelo-laptop",
        "quantity": 5,
        "costPrice": 2000.00,
        "salePrice": 2450.00,
        "hasSerialNumbers": true,
        "serialNumbers": ["SN-001", "SN-002", "SN-003", "SN-004", "SN-005"]
      },
      {
        "catalogId": "uuid-modelo-mouse-o-ram",
        "quantity": 20,
        "costPrice": 15.00,
        "salePrice": 30.00,
        "hasSerialNumbers": false
      }
    ]
  }
  ```
- **Reglas de Negocio Atómicas (`TransactionManagerPort`):**
  1. Verificar que cada `catalogId` exista y tenga `active: true` (`404 Not Found` / `400 Bad Request`).
  2. **Actualización Maestra de Saldo (Siempre):** Ejecutar `upsert` en `QuantityStock` para `(catalogId, almacenCentralId)` incrementando `quantity` en la cantidad ingresada y actualizando `costPrice` y `salePrice`.
  3. **Registro de Series Individuales (Condicional):**
     - **Si `hasSerialNumbers === true` (o `serialNumbers` contiene elementos):**
       - Validar que `serialNumbers.length === quantity` (`400 Bad Request` si no coinciden).
       - Validar que no haya series duplicadas dentro del mismo payload ni existentes en `HardwareItem` (`409 Conflict` detallando las series repetidas).
       - Insertar `quantity` registros en `HardwareItem` vinculados a `catalogId` y `almacenCentralId` con `status: ItemStatus.EN_STOCK`, `costPrice`, `salePrice` y `parentChassisId: null`.
       - Asegurar que `ProductCatalog.isSerialized` sea `true`.
     - **Si `hasSerialNumbers === false` (o `serialNumbers` vacío/omitido):**
       - No insertar registros en `HardwareItem`.
  4. Registrar evento `UNIFIED_INVENTORY_INBOUND` en `AuditLogPort` con el resumen de modelos, cantidades, ubicación destino (`Almacén Central`) y series registradas.

#### B. Sincronización de Conteo entre `QuantityStock` y `HardwareItem`
Para evitar descuadres entre el saldo total (`QuantityStock`) y el detalle de series (`HardwareItem`):
1. **Baja Lógica (`PATCH /hardware-items/:id/decommission` — `ADMIN`, `ENCARGADO_ALMACEN`):**
   - Al pasar un ítem de `EN_STOCK` a `DE_BAJA`, decrementar en `1` la `quantity` correspondiente en `QuantityStock` para `(catalogId, locationId)` dentro de la misma transacción.
2. **Aprobación de Segunda Mano (`POST /hardware-items/approve-used` — `ADMIN`, `ENCARGADO_ALMACEN`):**
   - Al aprobar un componente usado (`EN_STOCK`) y vincularlo a su catálogo `-USED` y `locationId`, incrementar en `1` la `quantity` en `QuantityStock` para `(usedCatalogId, locationId)` dentro de la misma transacción.
3. **Ajuste Manual de Cantidad (`PATCH /quantity-stock/adjust` — `ADMIN`, `ENCARGADO_ALMACEN`):**
   - Si existen ítems en estado `EN_STOCK` en `HardwareItem` para ese `(catalogId, locationId)`, rechazar el ajuste numérico directo (`400 Bad Request`) exigiendo gestionar las bajas o ingresos mediante las series individuales para mantener la integridad 1:1.

#### C. Consulta de Series Disponibles para Distribución (`GET /hardware-items/available-serials`)
- **Roles Permitidos:** `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO`.
- **Query Params:**
  - `catalogId` *(UUID obligatorio)*: Modelo a consultar.
  - `locationId` *(UUID opcional)*: Si se omite, filtra automáticamente por la ubicación `ALMACEN_CENTRAL`.
- **Respuesta (`200 OK`):** Lista ligera (`id`, `serialNumber`, `salePrice`, `createdAt`) de las unidades en estado `EN_STOCK` disponibles para que el `ENCARGADO_ALMACEN` seleccione qué números de serie enviará a cada puesto.

#### D. Impresión Dual de Etiquetas Térmicas 1D (Code 128)
1. **Impresión por Modelo / Cantidad (`POST /inventory/barcode-labels/by-model`):**
   - **Roles Permitidos:** `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO`.
   - **Body:** `{ "catalogId": "uuid", "locationId": "uuid-opcional", "copies": 20 }`
   - **Comportamiento:** Genera un arreglo con `copies` etiquetas idénticas donde `barcodeValue = catalog.sku`, `title = "${brand}${model}"`, `specsSummary` con las especificaciones técnicas y `price` (tomado de `QuantityStock.salePrice` de esa ubicación o `catalog.basePrice`). Registra `PRINT_MODEL_BARCODE_LABELS` en bitácora.
2. **Impresión Individual por Número de Serie (`POST /hardware-items/barcode-labels/batch` y `GET /hardware-items/:id/barcode-label`):**
   - **Roles Permitidos:** `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO`.
   - **Comportamiento:** Genera etiquetas individuales donde `barcodeValue = item.serialNumber`, `title = "${brand}${model}"`, `specsSummary`, `locationName` y `price`. Registra `PRINT_BARCODE_LABELS_BATCH` / `PRINT_BARCODE_LABEL` en bitácora.

#### E. Limpieza de Endpoints Obsoletos
- Remover los endpoints HTTP de acople/despiece Padre-Hijo (`POST /hardware-items/:id/children` y `DELETE /hardware-items/:id/children/:childId`) y la estructura anidada `children` en `batch-inbound`.

---

## 5. Criterios de Aceptación
1. `prisma/schema.prisma` actualizado (`Role.ENCARGADO_ALMACEN` agregado, `ProductCatalog.name` eliminado) y sincronizado mediante `npx prisma db push` y `npx prisma generate`.
2. Cumplimiento estricto de la Arquitectura Monolito Modular Hexagonal (`domain/` y `application/` sin imports de `@prisma/client`, `@nestjs/swagger` ni decoradores HTTP).
3. Sincronización transaccional verificada entre `QuantityStock` y `HardwareItem` en ingresos, bajas lógicas y aprobación de segunda mano.
4. `npm run build` compila con **0 errores** de TypeScript.
5. Swagger (`/api`) y `specs/API_CONTRACTS.md` actualizados con todos los contratos de la Fase 1.5.

```