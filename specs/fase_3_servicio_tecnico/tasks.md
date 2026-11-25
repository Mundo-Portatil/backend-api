# Tareas de Implementación — Fase 3: Servicio Técnico y Taller (`service-orders` — M7)

Seguir estrictamente el orden secuencial definido a continuación, respetando la Arquitectura Monolito Modular Hexagonal (`@specs/CONSTITUTION.md`) y el plan técnico (`@specs/fase_3_servicio_tecnico/plan.md`).

---

## Fase 3.1: Base de Datos y Prisma Schema
- [x] **Tarea 3.1.1 — Actualizar Enums en `prisma/schema.prisma`**:
  - Reemplazar `enum ServiceStatus` por `enum ServiceOrderStatus` (`RECIBIDO`, `EN_REPARACION`, `LISTO`, `ENTREGADO`, `CANCELADO`).
  - Actualizar `enum PaymentMethod` (`EFECTIVO`, `YAPE`, `PLIN`, `TARJETA`, `TRANSFERENCIA`).
  - Agregar `enum CustomerDocumentType` (`SIN_DOCUMENTO`, `DNI`, `RUC`, `CE`).
  - Agregar `enum ReceiptType` (`BOLETA_INTERNA`, `BOLETA`, `FACTURA`).
  - Agregar `enum SunatStatus` (`NO_APLICA`, `PENDIENTE`, `ACEPTADO`, `RECHAZADO`).
- [x] **Tarea 3.1.2 — Alinear Modelos en `prisma/schema.prisma`**:
  - Actualizar `model TechnicalServiceOrder` (tabla `technical_service_orders`) con todos los campos especificados: `code`, `locationId`, `technicianId`, cliente, equipo, diagnóstico, `laborCost`, `partsTotal`, `totalAmount`, `status`, `cancelReason`, marcas de tiempo y relaciones.
  - Actualizar `model ServiceItem` (tabla `service_items`) con: `catalogId`, `hardwareItemId`, `sourceLocationId`, `isFromOtherPuesto`, `quantity`, `unitPrice`, `subtotal` y relaciones.
  - Crear `model ServiceOrderPayment` (tabla `service_order_payments`) con `serviceOrderId`, `method`, `amount`, `reference`, `createdAt`.
  - Crear `model ServiceReceipt` (tabla `service_receipts`) con `serviceOrderId`, `receiptType`, `series`, `correlative`, `fullNumber`, datos de cliente, `subtotal`, `igvAmount`, `totalAmount`, campos SUNAT y `issuedAt`.
  - Actualizar relaciones en `model User`, `model Location`, `model ProductCatalog` y `model HardwareItem`.
- [x] **Tarea 3.1.3 — Validar y Sincronizar Prisma**:
  - Ejecutar `npx prisma validate`.
  - Ejecutar `npx prisma db push --accept-data-loss` (manteniendo estrictamente Prisma v5.22.0).
  - Ejecutar `npx prisma generate`.

---

## Fase 3.2: Capa de Dominio (`domain/`)
- [x] **Tarea 3.2.1 — Entidades de Dominio**:
  - Crear `src/modules/service-orders/domain/entities/service-item.entity.ts`.
  - Crear `src/modules/service-orders/domain/entities/service-order-payment.entity.ts`.
  - Crear `src/modules/service-orders/domain/entities/service-receipt.entity.ts`.
  - Crear `src/modules/service-orders/domain/entities/technical-service-order.entity.ts` con invariantes de validación de estado, recálculo de totales y métodos de transición.
- [x] **Tarea 3.2.2 — Puertos de Salida**:
  - Crear `src/modules/service-orders/domain/ports/out/service-order-repository.port.ts` con símbolo `SERVICE_ORDER_REPOSITORY` y métodos `save`, `findById`, `findByCode`, `findAll`, `countByStatus`, `saveItem`, `removeItem`, `savePayment`, `saveReceipt`, `findReceiptByOrderId`.
  - Crear `src/modules/service-orders/domain/ports/out/service-order-code-generator.port.ts` con símbolo `SERVICE_ORDER_CODE_GENERATOR`.
  - Crear `src/modules/service-orders/domain/ports/out/receipt-number-generator.port.ts` con símbolo `RECEIPT_NUMBER_GENERATOR`.
  - Crear `src/modules/service-orders/domain/ports/out/electronic-billing.port.ts` con símbolo `ELECTRONIC_BILLING_PORT`.

---

## Fase 3.3: Capa de Aplicación (`application/`)
- [x] **Tarea 3.3.1 — DTOs de Entrada y Salida**:
  - Crear DTOs de comando: `create-service-order-command.dto.ts`, `update-service-order-command.dto.ts`, `change-service-order-status-command.dto.ts`, `add-service-item-command.dto.ts`, `deliver-service-order-command.dto.ts`, `query-service-orders.dto.ts`.
  - Crear DTOs de respuesta: `service-order-response.dto.ts`, `service-order-detail-response.dto.ts`, `service-order-list-response.dto.ts` (con `countsByStatus`), y `service-receipt-response.dto.ts` (formato limpio de boleta manual sin IGV ni campos SUNAT).
- [x] **Tarea 3.3.2 — Casos de Uso de Órdenes**:
  - Crear `create-service-order.use-case.ts`: validación de puesto según rol (`TECNICO` vs `ADMIN`), generación de código `OS-XXXXXX`, estado inicial `RECIBIDO`, registro en `AuditLog`.
  - Crear `get-service-orders.use-case.ts`: filtros por búsqueda, puesto (acotado para técnico), fechas, estado (con soporte de historial para `status=ENTREGADO`) y cálculo consolidado de `countsByStatus`.
  - Crear `get-service-order-detail.use-case.ts`: validación de acceso por puesto para técnico, carga de ítems, pagos y boleta.
  - Crear `update-service-order.use-case.ts`: modificación de cliente, equipo, notas técnicas, piezas extraídas y costo de mano de obra.
  - Crear `change-service-order-status.use-case.ts`: transiciones válidas y reversión atómica de inventario ante cancelación (`CANCELADO`).
- [x] **Tarea 3.3.3 — Casos de Uso de Repuestos e Inventario**:
  - Crear `add-service-item.use-case.ts`: consumo de propio puesto o de otro `PUESTO` (`isFromOtherPuesto = true`), descuento atómico en `HardwareItem` y `QuantityStock` dentro de `TransactionManagerPort`, y emisión de `SERVICE_ORDER_ADD_ITEM`.
  - Crear `remove-service-item.use-case.ts`: reversión atómica de existencias al `sourceLocationId` original y recálculo de orden.
- [x] **Tarea 3.3.4 — Casos de Uso de Entrega y Boleta**:
  - Crear `deliver-service-order.use-case.ts`: validación de cuadre exacto de pagos combinados, generación de boleta (`BS01-XXXXXX`), persistencia tributaria interna, llamada a `ElectronicBillingPort` y transición a `ENTREGADO`.
  - Crear `get-service-receipt.use-case.ts`: formateo de salida de boleta tradicional (sin exponer IGV ni campos SUNAT).

---

## Fase 3.4: Capa de Infraestructura (`infrastructure/`)
- [x] **Tarea 3.4.1 — DTOs HTTP y Validación**:
  - Crear DTOs con decoradores Swagger y `class-validator`: `create-service-order.http-dto.ts`, `update-service-order.http-dto.ts`, `change-service-order-status.http-dto.ts`, `add-service-item.http-dto.ts`, `deliver-service-order.http-dto.ts`, `query-service-orders.http-dto.ts`.
- [x] **Tarea 3.4.2 — Adaptadores de Persistencia y Generadores**:
  - Crear `service-order.mapper.ts`.
  - Crear `prisma-service-order.repository.ts` implementando `ServiceOrderRepositoryPort`.
  - Crear `crypto-service-order-code-generator.adapter.ts` implementando `ServiceOrderCodeGeneratorPort`.
  - Crear `sequential-receipt-number-generator.adapter.ts` implementando `ReceiptNumberGeneratorPort`.
  - Crear `internal-receipt-billing.adapter.ts` implementando `ElectronicBillingPort`.
- [x] **Tarea 3.4.3 — Controlador HTTP y Módulo NestJS**:
  - Crear `service-orders.controller.ts` con las 9 rutas protegidas con `@Roles(Role.TECNICO, Role.ADMIN)`.
  - Crear `service-orders.module.ts` importando dependencias (`PrismaModule`, `AuditLogsModule`, `HardwareItemsModule`, `QuantityStockModule`, `LocationsModule`, `CatalogModule`) y registrando controladores y providers.
  - Registrar `ServiceOrdersModule` en `src/app.module.ts`.

---

## Fase 3.5: Integración con Hoja de Vida (`HardwareItem`)
- [x] **Tarea 3.5.1 — Actualizar `GetHardwareLifecycleUseCase`**:
  - En `src/modules/hardware-items/application/use-cases/get-hardware-lifecycle.use-case.ts`, agregar formato legible para:
    - `SERVICE_ORDER_ADD_ITEM`: Detallar consumo en orden de servicio técnico, código de orden y puesto de origen (si provino de otro puesto).
    - `SERVICE_ORDER_REMOVE_ITEM`: Detallar reingreso a stock por retiro del repuesto.
    - `SERVICE_ORDER_CANCELLED`: Detallar reingreso a stock por anulación de la orden.

---

## Fase 3.6: Pruebas Unitarias y Verificación
- [x] **Tarea 3.6.1 — Pruebas Unitarias de Casos de Uso**:
  - Crear pruebas unitarias para `CreateServiceOrderUseCase`.
  - Crear pruebas unitarias para `AddServiceItemUseCase` (consumo local y de otro puesto).
  - Crear pruebas unitarias para `DeliverServiceOrderUseCase` (cuadre exacto de pagos).
  - Crear pruebas unitarias para `GetServiceReceiptUseCase` (verificar omisión de IGV y campos SUNAT).
  - Crear pruebas unitarias para `ChangeServiceOrderStatusUseCase` (reversión atómica en cancelación).
- [x] **Tarea 3.6.2 — Ejecutar Suite de Pruebas y Compilación**:
  - Ejecutar `npm test` verificando que pasen al 100% todas las suites existentes y nuevas.
  - Ejecutar `npm run build` verificando 0 errores de compilación TypeScript.
  - Auditar 0 imports de infraestructura en `domain/` y `application/`.

---

## Fase 3.7: Actualización de Contratos de API
- [x] **Tarea 3.7.1 — Actualizar `@specs/API_CONTRACTS.md`**:
  - En la **Sección 1.4**, agregar las tablas de `ServiceOrderStatus`, `PaymentMethod`, `CustomerDocumentType`, `ReceiptType`, `SunatStatus`.
  - Agregar la nueva **Sección: Endpoints por Módulo (Fase 3: Servicio Técnico y Taller — M7)** documentando exhaustivamente las 9 rutas con ejemplos JSON completos de petición y respuesta.
  - Actualizar la tabla resumen en la **Sección 6** incorporando todas las rutas del módulo de Servicio Técnico.
