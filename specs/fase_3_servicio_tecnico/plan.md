# Plan Técnico — Fase 3: Módulo de Servicio Técnico y Taller (`service-orders` — M7)

## 1. Resumen Ejecutivo y Motivación
La Fase 3 implementa el módulo de **Servicio Técnico y Taller (`src/modules/service-orders/`)** para gestionar el ciclo de vida completo de las órdenes de servicio técnico (`OS-XXXXXX`), desde la recepción de equipos, diagnóstico y consumo de repuestos (tanto del puesto propio como de otros puestos), hasta la entrega, cobro combinado y emisión de boleta física tradicional con respaldo tributario interno para SUNAT.

El diseño sigue estrictamente la Arquitectura Monolito Modular Hexagonal (`@specs/CONSTITUTION.md`), garantizando:
1. **Acceso exclusivo y ámbito por puesto:** Solo `TECNICO` (acotado a su puesto) y `ADMIN` (visibilidad global o filtrada por puesto) pueden operar. `VENDEDOR` y `ENCARGADO_ALMACEN` reciben `403 Forbidden`.
2. **Ciclo de vida e historial:** Estados `RECIBIDO` $\rightarrow$ `EN_REPARACION` $\rightarrow$ `LISTO` $\rightarrow$ `ENTREGADO` (y `CANCELADO`). El listado `GET /service-orders` entrega `countsByStatus` consolidado para alimentar las tarjetas/pestañas de estado y soporta el historial de servicios realizados (`status=ENTREGADO`).
3. **Consumo atómico de repuestos:** Deducción inmediata en `HardwareItem` y `QuantityStock` (incluyendo soporte de `isFromOtherPuesto = true`), con reversión atómica ante retiro de repuestos o cancelación de la orden, y reflejo automático en la Hoja de Vida (`GET /hardware-items/:id/lifecycle`).
4. **Cobro y boleta tradicional:** Soporte de pagos combinados (`EFECTIVO`, `YAPE`, `PLIN`, `TARJETA`, `TRANSFERENCIA`), emisión de `ServiceReceipt` (`BS01-XXXXXX`) con persistencia interna de `subtotal`, `igvAmount` y estado SUNAT desacoplado en el puerto `ElectronicBillingPort`, pero exponiendo una respuesta limpia estilo boleta manual (sin IGV ni campos SUNAT) en `GET /service-orders/:id/receipt`.

---

## 2. Auditoría del Estado Actual

### 2.1. Base de Datos y Prisma Schema
- **Enums existentes en `prisma/schema.prisma`:**
  - `ServiceStatus` (valores obsoletos: `RECIBIDO`, `EN_DIAGNOSTICO`, `EN_REPARACION`, `LISTO_PARA_ENTREGA`, `ENTREGADO_Y_LIQUIDADO`, `CANCELADO`). Debe ser reemplazado por `ServiceOrderStatus` con los valores válidos: `RECIBIDO`, `EN_REPARACION`, `LISTO`, `ENTREGADO`, `CANCELADO`.
  - `PaymentMethod` (actualmente: `EFECTIVO`, `TARJETA`, `TRANSFERENCIA`, `MIXTO`). Debe alinearse con: `EFECTIVO`, `YAPE`, `PLIN`, `TARJETA`, `TRANSFERENCIA`.
- **Nuevos Enums requeridos:**
  - `CustomerDocumentType`: `SIN_DOCUMENTO`, `DNI`, `RUC`, `CE`.
  - `ReceiptType`: `BOLETA_INTERNA`, `BOLETA`, `FACTURA`.
  - `SunatStatus`: `NO_APLICA`, `PENDIENTE`, `ACEPTADO`, `RECHAZADO`.
- **Modelos existentes en `prisma/schema.prisma`:**
  - `TechnicalServiceOrder` (tabla `technical_service_orders`): Contiene campos preliminares desalineados (`ticketNumber`, `clientName`, `clientPhone`, `deviceModel`, `reportedFault`, `technicalDiagnosis`, `technicianUserId`, `totalCost`). Requiere ser alineada por completo a la especificación oficial.
  - `ServiceItem` (tabla `service_items`): Contiene una relación básica preliminar con `HardwareItem`. Requiere incorporar `catalogId`, `hardwareItemId?`, `sourceLocationId`, `isFromOtherPuesto`, `quantity`, `unitPrice` y `subtotal`.
- **Nuevos Modelos requeridos:**
  - `ServiceOrderPayment` (tabla `service_order_payments`): Registro de pagos parciales o combinados asociados a la orden.
  - `ServiceReceipt` (tabla `service_receipts`): Comprobante de servicio técnico con serie, correlativo y respaldo tributario.
- **Relaciones requeridas:**
  - `User`: `serviceOrders TechnicalServiceOrder[]`.
  - `Location`: `serviceOrders TechnicalServiceOrder[]`, `sourceServiceItems ServiceItem[] @relation("ServiceItemSourceLocation")`.
  - `ProductCatalog`: `serviceItems ServiceItem[]`.
  - `HardwareItem`: `serviceItems ServiceItem[]`.

### 2.2. Módulos Existentes en `src/`
- En `src/`: no existe ninguna referencia a `TechnicalServiceOrder`, `ServiceItem` o `ServiceStatus`. El módulo `src/modules/service-orders/` se implementará desde cero.
- En `src/modules/hardware-items/application/use-cases/get-hardware-lifecycle.use-case.ts`: se añadirá el formateo para los eventos `SERVICE_ORDER_ADD_ITEM`, `SERVICE_ORDER_REMOVE_ITEM` y `SERVICE_ORDER_CANCELLED` para que se visualicen claramente en la Hoja de Vida.

---

## 3. Diseño de Base de Datos (`prisma/schema.prisma`)

Se mantendrá estricto cumplimiento de **Prisma v5.22.0**.

### 3.1. Enums
```prisma
enum ServiceOrderStatus {
  RECIBIDO
  EN_REPARACION
  LISTO
  ENTREGADO
  CANCELADO
}

enum PaymentMethod {
  EFECTIVO
  YAPE
  PLIN
  TARJETA
  TRANSFERENCIA
}

enum CustomerDocumentType {
  SIN_DOCUMENTO
  DNI
  RUC
  CE
}

enum ReceiptType {
  BOLETA_INTERNA
  BOLETA
  FACTURA
}

enum SunatStatus {
  NO_APLICA
  PENDIENTE
  ACEPTADO
  RECHAZADO
}
```

### 3.2. Modelos
```prisma
model TechnicalServiceOrder {
  id                   String               @id @default(uuid())
  code                 String               @unique // Ej: "OS-4A9B1C"
  locationId           String
  technicianId         String
  customerName         String
  customerDocumentType CustomerDocumentType @default(SIN_DOCUMENTO)
  customerDocument     String?
  customerPhone        String?
  customerAddress      String?
  deviceBrand          String
  deviceModel          String
  deviceSerial         String?
  deviceAccessories    String?
  reportedIssue        String
  technicalNotes       String?
  extractedPartsNotes  String?
  laborCost            Decimal              @default(0.00) @db.Decimal(10, 2)
  partsTotal           Decimal              @default(0.00) @db.Decimal(10, 2)
  totalAmount          Decimal              @default(0.00) @db.Decimal(10, 2)
  status               ServiceOrderStatus   @default(RECIBIDO)
  cancelReason         String?
  deliveredAt          DateTime?
  cancelledAt          DateTime?
  createdAt            DateTime             @default(now())
  updatedAt            DateTime             @updatedAt

  location             Location             @relation(fields: [locationId], references: [id])
  technician           User                 @relation(fields: [technicianId], references: [id])
  items                ServiceItem[]
  payments             ServiceOrderPayment[]
  receipt              ServiceReceipt?

  @@map("technical_service_orders")
}

model ServiceItem {
  id                String                @id @default(uuid())
  serviceOrderId    String
  catalogId         String
  hardwareItemId    String?
  sourceLocationId  String
  isFromOtherPuesto Boolean               @default(false)
  quantity          Int                   @default(1)
  unitPrice         Decimal               @db.Decimal(10, 2)
  subtotal          Decimal               @db.Decimal(10, 2)
  createdAt         DateTime              @default(now())

  serviceOrder      TechnicalServiceOrder @relation(fields: [serviceOrderId], references: [id], onDelete: Cascade)
  catalog           ProductCatalog        @relation(fields: [catalogId], references: [id])
  hardwareItem      HardwareItem?         @relation(fields: [hardwareItemId], references: [id])
  sourceLocation    Location              @relation("ServiceItemSourceLocation", fields: [sourceLocationId], references: [id])

  @@map("service_items")
}

model ServiceOrderPayment {
  id             String                @id @default(uuid())
  serviceOrderId String
  method         PaymentMethod
  amount         Decimal               @db.Decimal(10, 2)
  reference      String?
  createdAt      DateTime              @default(now())

  serviceOrder   TechnicalServiceOrder @relation(fields: [serviceOrderId], references: [id], onDelete: Cascade)

  @@map("service_order_payments")
}

model ServiceReceipt {
  id                   String                @id @default(uuid())
  serviceOrderId       String                @unique
  receiptType          ReceiptType           @default(BOLETA_INTERNA)
  series               String                // Ej: "BS01", "B001", "F001"
  correlative          String                // Ej: "000001"
  fullNumber           String                @unique // Ej: "BS01-000001"
  customerName         String
  customerDocumentType CustomerDocumentType
  customerDocument     String?
  customerAddress      String?
  currency             String                @default("PEN")
  subtotal             Decimal               @db.Decimal(10, 2)
  igvAmount            Decimal               @db.Decimal(10, 2)
  totalAmount          Decimal               @db.Decimal(10, 2)
  sunatStatus          SunatStatus           @default(NO_APLICA)
  sunatHash            String?
  sunatCdrCode         String?
  sunatXmlUrl          String?
  sunatPdfUrl          String?
  issuedAt             DateTime              @default(now())

  serviceOrder         TechnicalServiceOrder @relation(fields: [serviceOrderId], references: [id], onDelete: Cascade)

  @@map("service_receipts")
}
```

---

## 4. Arquitectura Hexagonal del Módulo (`src/modules/service-orders/`)

```
src/modules/service-orders/
├── domain/
│   ├── entities/
│   │   ├── technical-service-order.entity.ts
│   │   ├── service-item.entity.ts
│   │   ├── service-order-payment.entity.ts
│   │   └── service-receipt.entity.ts
│   └── ports/
│       └── out/
│           ├── service-order-repository.port.ts (SERVICE_ORDER_REPOSITORY)
│           ├── service-order-code-generator.port.ts (SERVICE_ORDER_CODE_GENERATOR)
│           ├── receipt-number-generator.port.ts (RECEIPT_NUMBER_GENERATOR)
│           └── electronic-billing.port.ts (ELECTRONIC_BILLING_PORT)
├── application/
│   ├── dto/
│   │   ├── create-service-order-command.dto.ts
│   │   ├── update-service-order-command.dto.ts
│   │   ├── change-service-order-status-command.dto.ts
│   │   ├── add-service-item-command.dto.ts
│   │   ├── deliver-service-order-command.dto.ts
│   │   ├── query-service-orders.dto.ts
│   │   ├── service-order-response.dto.ts
│   │   ├── service-order-detail-response.dto.ts
│   │   ├── service-order-list-response.dto.ts
│   │   └── service-receipt-response.dto.ts
│   └── use-cases/
│       ├── create-service-order.use-case.ts
│       ├── get-service-orders.use-case.ts
│       ├── get-service-order-detail.use-case.ts
│       ├── update-service-order.use-case.ts
│       ├── change-service-order-status.use-case.ts
│       ├── add-service-item.use-case.ts
│       ├── remove-service-item.use-case.ts
│       ├── deliver-service-order.use-case.ts
│       └── get-service-receipt.use-case.ts
├── infrastructure/
│   ├── adapters/
│   │   ├── in/
│   │   │   └── http/
│   │   │       ├── dto/
│   │   │       │   ├── create-service-order.http-dto.ts
│   │   │       │   ├── update-service-order.http-dto.ts
│   │   │       │   ├── change-service-order-status.http-dto.ts
│   │   │       │   ├── add-service-item.http-dto.ts
│   │   │       │   ├── deliver-service-order.http-dto.ts
│   │   │       │   └── query-service-orders.http-dto.ts
│   │   │       └── service-orders.controller.ts
│   │   └── out/
│   │       ├── persistence/
│   │       │   ├── prisma-service-order.repository.ts
│   │       │   └── service-order.mapper.ts
│   │       ├── generators/
│   │       │   ├── crypto-service-order-code-generator.adapter.ts
│   │       │   └── sequential-receipt-number-generator.adapter.ts
│   │       └── billing/
│   │           └── internal-receipt-billing.adapter.ts
└── service-orders.module.ts
```

### 4.1. Dominio Puro (`domain/`)
- **`TechnicalServiceOrderEntity`**:
  - Encapsula invariantes de negocio: no permite transiciones desde estados terminales (`ENTREGADO`, `CANCELADO`), recalcula totales (`partsTotal = sum(items.subtotal)`, `totalAmount = laborCost + partsTotal`), valida transiciones de estado permitidas:
    - `RECIBIDO` $\rightarrow$ `EN_REPARACION`, `LISTO`, `CANCELADO`.
    - `EN_REPARACION` $\rightarrow$ `LISTO`, `CANCELADO`.
    - `LISTO` $\rightarrow$ `EN_REPARACION`, `CANCELADO`.
    - `ENTREGADO` solo mediante entrega y pago.
- **`ElectronicBillingPort`**:
  - Puerto desacoplado para envío a SUNAT/OSE. Retorna `{ sunatStatus, sunatHash?, sunatCdrCode?, sunatXmlUrl?, sunatPdfUrl? }`.

### 4.2. Casos de Uso (`application/`)
1. **`CreateServiceOrderUseCase` (`POST /service-orders`):**
   - Resuelve `locationId`: si `role === TECNICO`, usa `req.user.locationId` (rechaza si intenta enviar otro puesto o no tiene puesto); si `role === ADMIN`, valida que el `locationId` enviado sea un `PUESTO` activo.
   - Genera código único `OS-XXXXXX`. Crea la orden en estado `RECIBIDO` con `laborCost`, `partsTotal = 0` y `totalAmount = laborCost`.
   - Emite evento `SERVICE_ORDER_CREATED` en `AuditLog`.
2. **`GetServiceOrdersUseCase` (`GET /service-orders`):**
   - Ámbito de visualización: para `TECNICO`, filtra estrictamente por `req.user.locationId`; para `ADMIN`, permite filtrar opcionalmente por `locationId`.
   - Búsqueda: texto parcial en código `OS-XXXXXX`, cliente, documento, teléfono, marca, modelo o serie del equipo.
   - Filtro de estado: si `status=ENTREGADO`, sirve como **Historial de Servicios Realizados**.
   - **`countsByStatus`:** Calcula de forma paralela los conteos de órdenes en cada estado (`RECIBIDO`, `EN_REPARACION`, `LISTO`, `ENTREGADO`, `CANCELADO`) dentro del ámbito de ubicación correspondiente, sin verse afectado por el filtro `status` para que las pestañas del frontend mantengan sus contadores.
3. **`GetServiceOrderDetailUseCase` (`GET /service-orders/:id`):**
   - Acepta UUID o código `OS-XXXXXX`. Valida permisos de pertenencia de puesto para `TECNICO`. Retorna orden con ítems, pagos y recibo si existe.
4. **`UpdateServiceOrderUseCase` (`PATCH /service-orders/:id`):**
   - Solo en estados `RECIBIDO`, `EN_REPARACION`, `LISTO`. Actualiza cliente, equipo, notas técnicas, piezas extraídas y mano de obra recalculando totales.
5. **`ChangeServiceOrderStatusUseCase` (`PATCH /service-orders/:id/status`):**
   - Transiciona entre estados no terminales o a `CANCELADO`.
   - Si `status === 'CANCELADO'`: exige `cancelReason` y, dentro de `TransactionManagerPort`, revierte todo el inventario de repuestos:
     - Serializados: `HardwareItem.status = 'EN_STOCK'` e incrementa `QuantityStock` en `+1` en `item.sourceLocationId`.
     - Cuantitativos: incrementa `QuantityStock` en `+item.quantity` en `item.sourceLocationId`.
   - Emite evento `SERVICE_ORDER_CANCELLED`.
6. **`AddServiceItemUseCase` (`POST /service-orders/:id/items`):**
   - Solo en estados `RECIBIDO`, `EN_REPARACION`, `LISTO`.
   - `sourceLocationId`: si se omite, toma `order.locationId`. Si se envía, valida que sea un `PUESTO` activo.
   - `isFromOtherPuesto = (sourceLocationId !== order.locationId)`.
   - Serializado: valida `HardwareItem.status === 'EN_STOCK'`, actualiza a `'VENDIDO'` y descuenta `QuantityStock` en `-1` en `sourceLocationId`.
   - Cuantitativo: descuenta `QuantityStock` en `-quantity` en `sourceLocationId`.
   - Recalcula `partsTotal` y `totalAmount`.
   - Emite `SERVICE_ORDER_ADD_ITEM` con datos de serie y ubicación para Hoja de Vida.
7. **`RemoveServiceItemUseCase` (`DELETE /service-orders/:id/items/:itemId`):**
   - Revierte atómicamente el stock en `item.sourceLocationId` y elimina el ítem recalculando totales.
8. **`DeliverServiceOrderUseCase` (`POST /service-orders/:id/deliver`):**
   - Valida cuadre exacto de medios de pago (`|sum(payments) - totalAmount| < 0.01`).
   - Genera serie (`BS01`, `B001`, `F001`) y correlativo único incremental de 6 dígitos.
   - Persiste internamente `ServiceReceipt` (calculando `subtotal` e `igvAmount`) y `ServiceOrderPayment[]`.
   - Cambia estado a `ENTREGADO`, invoca `ElectronicBillingPort.emitDocument()` y emite `SERVICE_ORDER_DELIVERED`.
9. **`GetServiceReceiptUseCase` (`GET /service-orders/:id/receipt`):**
   - Genera el DTO de respuesta público con formato de **boleta manual limpia**:
     - `businessName`, `locationName`, `fullNumber`, `issuedAt`, `orderCode`, `technicianName`, `customer`, `device`, `items` (repuestos + mano de obra), `currency: 'PEN'`, `totalAmount`, `payments`.
     - **Omite por completo `subtotal`, `igvAmount` y metadatos `sunat*`**.

### 4.3. Infraestructura (`infrastructure/`)
- **`TransfersController` vs `ServiceOrdersController`:**
  - Controlador `src/modules/service-orders/infrastructure/adapters/in/http/service-orders.controller.ts` decorado con `@ApiTags('Servicio Técnico y Taller (M7)')`, `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(Role.TECNICO, Role.ADMIN)` en todas sus rutas.
- **`InternalReceiptBillingAdapter`:**
  - Implementa `ElectronicBillingPort`. Retorna `sunatStatus: 'NO_APLICA'` para `BOLETA_INTERNA`, o `'PENDIENTE'` para `BOLETA`/`FACTURA`. Listo para integrar SUNAT/OSE en el futuro sin modificar los casos de uso.
- **`SequentialReceiptNumberGeneratorAdapter`:**
  - Consulta en base de datos el último correlativo para la serie (`BS01`, `B001`, `F001`) e incrementa correlativamente (`000001`, `000002`...).
- **`CryptoServiceOrderCodeGeneratorAdapter`:**
  - Genera códigos correlativos tipo `OS-XXXXXX` garantizando unicidad.

---

## 5. Estrategia de Pruebas Unitarias y Verificación

1. **Pruebas de Casos de Uso:**
   - `create-service-order.use-case.spec.ts`:
     - Validación de puesto obligatorio para `TECNICO`.
     - Rechazo si `TECNICO` envía un puesto ajeno.
     - Registro exitoso para `ADMIN` indicando puesto.
   - `add-service-item.use-case.spec.ts`:
     - Consumo de repuesto serializado y cuantitativo en propio puesto.
     - Consumo desde otro puesto con `isFromOtherPuesto = true` y descuento en `sourceLocationId`.
     - Rechazo si se intenta consumir desde `ALMACEN_CENTRAL`.
     - Rechazo por stock insuficiente o serie no disponible.
   - `deliver-service-order.use-case.spec.ts`:
     - Rechazo si la suma de pagos combinados no cuadra con `totalAmount`.
     - Emisión exitosa de `ServiceReceipt` y transición a `ENTREGADO`.
   - `get-service-receipt.use-case.spec.ts`:
     - Verificación de que el JSON de respuesta NO contiene `subtotal`, `igvAmount` ni campos SUNAT.
   - `change-service-order-status.use-case.spec.ts`:
     - Cancelación con reversión atómica de inventario serializado y cuantitativo.
2. **Pruebas de Integración y Regresión:**
   - Ejecutar `npm test` verificando 100% de éxito.
   - Ejecutar `npm run build` verificando 0 errores de compilación TypeScript.
   - Auditar 0 imports de infraestructura en `domain/` y `application/`.

---

## 6. Actualización de Contratos de API (`@specs/API_CONTRACTS.md`)

- Incorporar en la **Sección 1.4** los nuevos enums: `ServiceOrderStatus`, `PaymentMethod`, `CustomerDocumentType`, `ReceiptType`, `SunatStatus`.
- Agregar la nueva **Sección: Endpoints por Módulo (Fase 3: Servicio Técnico y Taller — M7)** documentando los 9 endpoints con parámetros, roles, cuerpos de petición y respuestas JSON completas.
- Actualizar la **Sección: Resumen Rápido de Rutas para Frontend** incorporando las rutas de la Fase 3.
