# Especificación Técnica — Fase 3: Módulo de Servicio Técnico y Taller (`service-orders` — M7)

## 1. Objetivo y Alcance
Implementar en `backend-api` el módulo completo de **Servicio Técnico y Taller (`src/modules/service-orders/`)** siguiendo estrictamente la Arquitectura Monolito Modular Hexagonal (`@specs/CONSTITUTION.md`):
1. **Control de Acceso y Ámbito por Puesto:**
   - Acceso exclusivo para los roles **`TECNICO`** y **`ADMIN`** (`403 Forbidden` para `VENDEDOR` y `ENCARGADO_ALMACEN`).
   - El `TECNICO` opera acotado automáticamente a su puesto asignado (`req.user.locationId`). El `ADMIN` tiene visibilidad global sobre todos los puestos y puede filtrar o registrar órdenes indicando el `locationId` del puesto.
2. **Ciclo de Vida e Historial de Servicios (`OS-XXXXXX`):**
   - Estados válidos: `RECIBIDO` $\rightarrow$ `EN_REPARACION` $\rightarrow$ `LISTO` $\rightarrow$ `ENTREGADO` (y `CANCELADO`). *(No se incluye estado `EN_DIAGNOSTICO`)*.
   - Consulta paginada con **conteo consolidado por estado (`countsByStatus`)** y filtros completos (`status`, `search`, `deviceSerial`, `locationId`, `technicianId`, `startDate`, `endDate`) para visualizar tanto las órdenes activas por estado como el **historial de servicios realizados** (`status = ENTREGADO`).
   - Registro de trabajo/diagnóstico técnico (`technicalNotes`) y anotación descriptiva de piezas extraídas durante reparaciones o mejoras (`extractedPartsNotes`), sin crear colas ni estados pendientes de segunda mano.
3. **Consumo de Repuestos (Propio Puesto y "Usar de Otro Puesto"):**
   - Al agregar un repuesto/producto a una orden, se descuenta **inmediatamente y de forma atómica** del inventario (`HardwareItem` + `QuantityStock`).
   - Por defecto se consume del puesto de la orden, pero el técnico puede seleccionar explícitamente otro `PUESTO` activo (`sourceLocationId`) marcando el ítem con `isFromOtherPuesto = true` para su trazabilidad y conciliación.
   - Si se retira un ítem de la orden o se cancela la orden (`CANCELADO`), el stock se revierte automáticamente a su `sourceLocationId` original.
4. **Cobro Final Combinado y Boleta Estilo Manual (Preparada Internamente para SUNAT):**
   - El cobro se realiza al momento de la entrega (`ENTREGADO`), soportando pagos combinados entre `EFECTIVO`, `YAPE`, `PLIN`, `TARJETA` y `TRANSFERENCIA`.
   - Emite automáticamente un comprobante/boleta (`ServiceReceipt`) con correlativo (`BS01-XXXXXX`).
   - **Separación Vista vs. Motor Tributario:** En la base de datos y en el puerto hexagonal `ElectronicBillingPort` se calculan y persisten `subtotal`, `igvAmount` y los campos `sunat*` listos para integrar facturación electrónica en el futuro; sin embargo, el endpoint público de la boleta (`GET /service-orders/:id/receipt`) **no expone IGV ni datos tributarios de SUNAT**, mostrando únicamente la estructura limpia de una boleta tradicional escrita a mano (cabecera, cliente, equipo, detalle del servicio/repuestos, total a pagar y medios de pago).

---

## 2. Reglas de Negocio Detalladas

### 2.1. Recepción y Actualización de Orden (`POST /service-orders`, `PATCH /service-orders/:id`)
- **Roles Permitidos:** `TECNICO`, `ADMIN`.
- **Resolución de Ubicación (`locationId`):**
  - Si `role === 'TECNICO'`: Usa obligatoriamente `req.user.locationId` (rechaza con `400 Bad Request` si intenta enviar otro `locationId` o si no tiene puesto asignado).
  - Si `role === 'ADMIN'`: Requiere `locationId` en el body y valida que sea una ubicación activa de tipo `PUESTO`.
- **Datos de Recepción (`POST /service-orders`):**
  - `customerName` (string requerido), `customerDocumentType` (`SIN_DOCUMENTO`, `DNI`, `RUC`, `CE` — default `SIN_DOCUMENTO`), `customerDocument` (opcional), `customerPhone` (opcional), `customerAddress` (opcional).
  - `deviceBrand` (requerido), `deviceModel` (requerido), `deviceSerial` (opcional), `deviceAccessories` (opcional), `reportedIssue` (requerido).
  - `laborCost` (decimal `>= 0`, opcional, default `0`), `technicalNotes` (opcional), `extractedPartsNotes` (opcional).
  - Genera código único correlativo `OS-XXXXXX` en estado `RECIBIDO` con `partsTotal = 0` y `totalAmount = laborCost`.
- **Edición Técnica (`PATCH /service-orders/:id`):**
  - Permitida únicamente mientras la orden esté en `RECIBIDO`, `EN_REPARACION` o `LISTO` (`409 Conflict` si ya está `ENTREGADO` o `CANCELADO`).
  - Permite actualizar `customerName`, `customerDocumentType`, `customerDocument`, `customerPhone`, `customerAddress`, `deviceSerial`, `deviceAccessories`, `reportedIssue`, `technicalNotes`, `extractedPartsNotes` y `laborCost` (recalculando `totalAmount = laborCost + partsTotal`).

### 2.2. Listado por Estados e Historial de Servicios (`GET /service-orders` y `GET /service-orders/:id`)
- **Ámbito por Rol:**
  - `TECNICO`: Visualiza únicamente las órdenes de su `req.user.locationId`.
  - `ADMIN`: Visualiza todas las órdenes o filtra opcionalmente por `locationId` y `technicianId`.
- **Filtros en `GET /service-orders`:**
  - `status` *(opcional)*: `RECIBIDO`, `EN_REPARACION`, `LISTO`, `ENTREGADO`, `CANCELADO`. (Cuando se filtra por `ENTREGADO`, funciona directamente como el **Historial de Servicios Realizados**).
  - `search` *(opcional)*: Búsqueda por código (`OS-XXXXXX`), nombre del cliente, documento (`DNI`/`RUC`), teléfono, marca/modelo o número de serie del equipo (`deviceSerial`).
  - `locationId` *(opcional, solo `ADMIN`)*, `technicianId` *(opcional)*, `startDate`, `endDate`, `page` (default `1`), `limit` (default `20`).
- **Estructura de Respuesta de `GET /service-orders`:**
  - Retorna `{ items, total, page, limit, countsByStatus }`, donde `countsByStatus` entrega el conteo actual de órdenes en cada estado (`RECIBIDO`, `EN_REPARACION`, `LISTO`, `ENTREGADO`, `CANCELADO`) dentro del ámbito del usuario (puesto del técnico o global/puesto filtrado para admin) para alimentar las pestañas/tarjetas de estado y el historial.
- **Detalle en `GET /service-orders/:id`:**
  - Acepta UUID o código legible `OS-XXXXXX`.
  - Retorna todos los datos de la orden, listado de repuestos consumidos (`items`, indicando si alguno vino de otro puesto), pagos registrados (`payments`) y resumen de boleta (`receipt` en formato simple sin IGV) si ya fue entregada.

### 2.3. Transiciones de Estado y Cancelación (`PATCH /service-orders/:id/status`)
- **Matriz de Transiciones Válidas:**
  - `RECIBIDO` $\rightarrow$ `EN_REPARACION`, `LISTO`, `CANCELADO`
  - `EN_REPARACION` $\rightarrow$ `LISTO`, `CANCELADO`
  - `LISTO` $\rightarrow$ `EN_REPARACION`, `CANCELADO`
  - *(La transición a `ENTREGADO` se realiza exclusivamente mediante `POST /service-orders/:id/deliver` para exigir el pago completo y emitir la boleta).*
  - `ENTREGADO` y `CANCELADO` son estados terminales (`409 Conflict` ante cualquier cambio).
- **Reversión Atómica en `CANCELADO`:**
  - Exige `cancelReason` (string no vacío).
  - Dentro de `TransactionManagerPort`, recorre todos los `ServiceItem` de la orden:
    - Si `hardwareItemId != null`: Restaura `HardwareItem.status = 'EN_STOCK'` e incrementa `QuantityStock` en `+1` en `item.sourceLocationId`.
    - Si `hardwareItemId == null`: Incrementa `QuantityStock` en `+item.quantity` en `item.sourceLocationId`.
  - Registra `SERVICE_ORDER_CANCELLED` en `AuditLogPort`.

### 2.4. Gestión de Repuestos en la Orden (`POST /service-orders/:id/items` y `DELETE /service-orders/:id/items/:itemId`)
- **Validaciones Previas:**
  - La orden debe pertenecer al puesto del `TECNICO` (o cualquier puesto si es `ADMIN`) y estar en estado `RECIBIDO`, `EN_REPARACION` o `LISTO`.
  - `sourceLocationId` (opcional): Si se omite, asume `order.locationId`. Si se envía distinto de `order.locationId`, valida que exista, esté activo y sea estrictamente de tipo `PUESTO` (no se permite consumir directo del `ALMACEN_CENTRAL`; el abastecimiento de almacén se realiza vía `POST /transfers/direct`).
  - Marca automáticamente `isFromOtherPuesto = (sourceLocationId !== order.locationId)`.
- **Consumo Atómico al Agregar (`POST /service-orders/:id/items`):**
  - **Producto Serializado (`catalog.isSerialized === true`):**
    - Exige `hardwareItemId` (UUID) y `quantity === 1`.
    - Verifica que el `HardwareItem` exista, pertenezca a `catalogId`, tenga `status === 'EN_STOCK'` y `locationId === sourceLocationId` (`400`/`409` si no cumple).
    - Actualiza `HardwareItem.status = 'VENDIDO'` y descuenta `-1` de `QuantityStock` en `(catalogId, sourceLocationId)`.
    - Precio unitario por defecto: `unitPrice ?? hardwareItem.salePrice ?? catalog.basePrice`.
  - **Producto por Cantidad (`catalog.isSerialized === false`):**
    - Rechaza si se envía `hardwareItemId`. Exige `quantity >= 1`.
    - Verifica saldo suficiente en `QuantityStock` para `(catalogId, sourceLocationId)` (`quantity >= requested`).
    - Descuenta `-quantity` en `QuantityStock` de `(catalogId, sourceLocationId)`.
    - Precio unitario por defecto: `unitPrice ?? quantityStock.salePrice ?? catalog.basePrice`.
  - Crea `ServiceItem`, recalcula `partsTotal` y `totalAmount` en `TechnicalServiceOrder`, y registra `SERVICE_ORDER_ADD_ITEM` en bitácora (incluyendo `isFromOtherPuesto`, `sourceLocationId`, `sourceLocationName` y `serialNumber` para la Hoja de Vida).
- **Retiro de Repuesto (`DELETE /service-orders/:id/items/:itemId`):**
  - Solo en estados `RECIBIDO`, `EN_REPARACION` o `LISTO`.
  - Revierte atómicamente `HardwareItem.status = 'EN_STOCK'` (si aplica) y suma `+item.quantity` en `QuantityStock` de `item.sourceLocationId`.
  - Recalcula `partsTotal` y `totalAmount`, y registra `SERVICE_ORDER_REMOVE_ITEM`.

### 2.5. Entrega, Pago Combinado y Boleta Estilo Manual (`POST /service-orders/:id/deliver` y `GET /service-orders/:id/receipt`)
- **Validaciones de Entrega (`POST /service-orders/:id/deliver`):**
  - La orden debe estar en estado `RECIBIDO`, `EN_REPARACION` o `LISTO` (rechaza `ENTREGADO` y `CANCELADO` con `409 Conflict`).
  - `payments`: Array obligatorio con al menos 1 medio de pago (`EFECTIVO`, `YAPE`, `PLIN`, `TARJETA`, `TRANSFERENCIA`), cada uno con `amount > 0` y `reference` opcional.
  - **Cuadre Exacto:** La suma de `payments[].amount` debe coincidir exactamente con `order.totalAmount` (`|sum - totalAmount| < 0.01`; si difiere, retorna `400 Bad Request`).
  - Permite actualizar opcionalmente `receiptType` (`BOLETA_INTERNA` por defecto, `BOLETA`, `FACTURA`), `customerDocumentType`, `customerDocument`, `customerName` y `customerAddress` antes de emitir el comprobante (si `receiptType === 'FACTURA'`, exige `customerDocumentType === 'RUC'` y `customerDocument` de 11 dígitos).
- **Persistencia Interna Tributaria y Puerto SUNAT:**
  - Calcula y guarda internamente en `ServiceReceipt`:
    - `totalAmount = order.totalAmount`
    - `subtotal = Number((totalAmount / 1.18).toFixed(2))`
    - `igvAmount = Number((totalAmount - subtotal).toFixed(2))`
    - `sunatStatus = 'NO_APLICA'` (y campos `sunatHash`, `sunatCdrCode`, `sunatXmlUrl`, `sunatPdfUrl` en `null`).
  - Genera serie según tipo (`BS01` para `BOLETA_INTERNA`, `B001` para `BOLETA`, `F001` para `FACTURA`) y correlativo incremental de 6 dígitos (`BS01-000001`).
  - Persiste `ServiceOrderPayment[]`, `ServiceReceipt` y actualiza `TechnicalServiceOrder` a `status = 'ENTREGADO'` y `deliveredAt = now()`.
  - Invoca el puerto hexagonal `ElectronicBillingPort.emitDocument(receipt)` (implementado inicialmente por `InternalReceiptBillingAdapter` como *no-op* preparado para sustituirse por el conector SUNAT/OSE sin tocar casos de uso ni controladores).
  - Registra `SERVICE_ORDER_DELIVERED` en `AuditLogPort`.
- **Formato de Salida de la Boleta (`GET /service-orders/:id/receipt` — Estilo Boleta Manual):**
  - **NO devuelve `subtotal`, `igvAmount` ni campos `sunat*`** en el JSON de respuesta.
  - Devuelve únicamente la estructura limpia de una boleta física tradicional:
    - `businessName`: `"Mundo Portátil"`
    - `locationName`: Nombre del puesto donde se realizó el servicio
    - `fullNumber`: ej. `"BS01-000001"`
    - `issuedAt`: Fecha y hora de emisión
    - `orderCode`: ej. `"OS-000001"`
    - `technicianName`: Nombre del técnico que atendió
    - `customer`: `{ name, documentType, document, phone, address }`
    - `device`: `{ brand, model, serial, accessories, reportedIssue, technicalNotes, extractedPartsNotes }`
    - `items`: Lista unificada lista para imprimir como tabla de boleta (`Cant. | Descripción | P. Unit. | Importe`), conformada por cada repuesto consumido (ej. `"SSD Kingston 500GB (N/S: SN-123)"`) más una línea de `"Servicio Técnico / Mano de Obra"` cuando `laborCost > 0`.
    - `currency`: `"PEN"`
    - `totalAmount`: Monto total final a pagar (sin desglose de IGV)
    - `payments`: Lista de pagos realizados (`[{ method, amount, reference }]`)

---

## 3. Diseño de Base de Datos (`prisma/schema.prisma`)

Revisar y alinear en `prisma/schema.prisma` (manteniendo estrictamente Prisma v5.22.0):
1. **Enums:**
   - `ServiceOrderStatus`: `RECIBIDO`, `EN_REPARACION`, `LISTO`, `ENTREGADO`, `CANCELADO`
   - `PaymentMethod`: `EFECTIVO`, `YAPE`, `PLIN`, `TARJETA`, `TRANSFERENCIA`
   - `CustomerDocumentType`: `SIN_DOCUMENTO`, `DNI`, `RUC`, `CE`
   - `ReceiptType`: `BOLETA_INTERNA`, `BOLETA`, `FACTURA`
   - `SunatStatus`: `NO_APLICA`, `PENDIENTE`, `ACEPTADO`, `RECHAZADO`
2. **Modelos:**
   - `TechnicalServiceOrder` (tabla `technical_service_orders`):
     - `id`, `code` (`@unique`), `locationId`, `technicianId`, `customerName`, `customerDocumentType`, `customerDocument`, `customerPhone`, `customerAddress`, `deviceBrand`, `deviceModel`, `deviceSerial`, `deviceAccessories`, `reportedIssue`, `technicalNotes`, `extractedPartsNotes`, `laborCost` (`Decimal(10,2)`), `partsTotal` (`Decimal(10,2)`), `totalAmount` (`Decimal(10,2)`), `status`, `cancelReason`, `deliveredAt`, `cancelledAt`, `createdAt`, `updatedAt`.
   - `ServiceItem` (tabla `service_items`):
     - `id`, `serviceOrderId`, `catalogId`, `hardwareItemId` (`String?`), `sourceLocationId`, `isFromOtherPuesto` (`Boolean @default(false)`), `quantity` (`Int @default(1)`), `unitPrice` (`Decimal(10,2)`), `subtotal` (`Decimal(10,2)`), `createdAt`.
   - `ServiceOrderPayment` (tabla `service_order_payments`):
     - `id`, `serviceOrderId`, `method` (`PaymentMethod`), `amount` (`Decimal(10,2)`), `reference` (`String?`), `createdAt`.
   - `ServiceReceipt` (tabla `service_receipts`):
     - `id`, `serviceOrderId` (`@unique`), `receiptType` (`ReceiptType`), `series`, `correlative`, `fullNumber` (`@unique`), `customerName`, `customerDocumentType`, `customerDocument`, `customerAddress`, `currency` (`@default("PEN")`), `subtotal` (`Decimal(10,2)`), `igvAmount` (`Decimal(10,2)`), `totalAmount` (`Decimal(10,2)`), `sunatStatus` (`SunatStatus @default(NO_APLICA)`), `sunatHash` (`String?`), `sunatCdrCode` (`String?`), `sunatXmlUrl` (`String?`), `sunatPdfUrl` (`String?`), `issuedAt`.

---

## 4. Endpoints HTTP del Módulo (`src/modules/service-orders/`)

| Método | Ruta | Roles | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/service-orders` | `TECNICO`, `ADMIN` | Registrar recepción de equipo y crear orden `OS-XXXXXX` (`RECIBIDO`) |
| `GET` | `/service-orders` | `TECNICO`, `ADMIN` | Listar órdenes por estados e historial (`status=ENTREGADO`), con `countsByStatus` y filtros (`search`, `locationId`, `technicianId`, `startDate`, `endDate`, `page`, `limit`) |
| `GET` | `/service-orders/:id` | `TECNICO`, `ADMIN` | Detalle completo de orden (acepta UUID o código `OS-XXXXXX`) con ítems, pagos y boleta |
| `PATCH` | `/service-orders/:id` | `TECNICO`, `ADMIN` | Actualizar datos del cliente/equipo, trabajo técnico, `extractedPartsNotes` y `laborCost` |
| `PATCH` | `/service-orders/:id/status` | `TECNICO`, `ADMIN` | Cambiar estado (`EN_REPARACION`, `LISTO`, `CANCELADO` con `cancelReason` y reversión atómica de stock) |
| `POST` | `/service-orders/:id/items` | `TECNICO`, `ADMIN` | Agregar repuesto (serializado o cuantitativo) desde el puesto propio o desde otro `PUESTO` (`sourceLocationId`) con descuento inmediato |
| `DELETE` | `/service-orders/:id/items/:itemId` | `TECNICO`, `ADMIN` | Retirar repuesto de la orden y restaurar stock en su `sourceLocationId` |
| `POST` | `/service-orders/:id/deliver` | `TECNICO`, `ADMIN` | Registrar pago combinado, marcar como `ENTREGADO` y emitir boleta (`ServiceReceipt`) |
| `GET` | `/service-orders/:id/receipt` | `TECNICO`, `ADMIN` | Obtener boleta estilo tradicional (sin IGV visible en respuesta, con respaldo tributario interno para SUNAT) |

---

## 5. Criterios de Aceptación
1. Arquitectura Hexagonal estricta en `src/modules/service-orders/` (`domain`, `application`, `infrastructure`) con puerto `ElectronicBillingPort` desacoplado para SUNAT.
2. `VENDEDOR` y `ENCARGADO_ALMACEN` reciben `403 Forbidden` en todas las rutas del módulo; `TECNICO` solo opera órdenes de su propio puesto.
3. `GET /service-orders` soporta filtrado por estado (incluyendo historial de `ENTREGADO`) y devuelve `countsByStatus` acotado al puesto/ámbito correspondiente.
4. El consumo de repuestos (propios y de otro puesto con `isFromOtherPuesto = true`) y su reversión al eliminar ítems o cancelar la orden mantienen sincronizados `HardwareItem` y `QuantityStock` atómicamente.
5. La entrega valida el cuadre exacto de pagos combinados y `GET /service-orders/:id/receipt` retorna el formato limpio de boleta manual (sin exponer IGV ni campos SUNAT, manteniéndolos guardados internamente).
6. `npx prisma validate`, `npx prisma db push`, `npx prisma generate`, `npm test`, `npm run build` y actualización de `@specs/API_CONTRACTS.md` completados sin errores.