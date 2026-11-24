# Plan Técnico — Fase 2 (Ajustada): Distribución Directa de Almacén y Depuración de Traslados (M3)

## 1. Resumen Ejecutivo y Motivación
En el diseño inicial de la Fase 2 se contemplaron dos flujos de movimiento interno de inventario:
1. **Flujo A (Distribución Directa):** Movimiento inmediato `Almacén Central <-> Puesto` ejecutado por el personal de almacén/administración para abastecimiento y devoluciones.
2. **Flujo B (Transferencias entre Puestos):** Flujo multi-etapa con estados `DRAFT` $\rightarrow$ `EN_TRANSITO` $\rightarrow$ `COMPLETED` (con escaneo de códigos de barra) y opción `CANCELLED` para cruces de productos entre puestos físicos.

Tras la definición de requerimientos del negocio, se determinó que los cruces rápidos de mercadería entre puestos vecinos para concretar una venta ("producto de otro puesto") serán modelados y resueltos directamente dentro del módulo de Punto de Venta (POS - M2 / M5 en Fase 4). Por consiguiente, el flujo multi-etapa entre puestos en el módulo M3 es redundante e innecesario.

El objetivo de este plan es **depurar limpiamente** todo el código muerto perteneciente al flujo multi-etapa (`ENTRE_PUESTOS`, `DRAFT`, `EN_TRANSITO`, `CANCELLED`), consolidando M3 como un módulo enfocado exclusivamente en **Distribución Directa (`Almacén Central <-> Puesto`)**, restringiendo la ejecución de traslados a `ADMIN` y `ENCARGADO_ALMACEN`, preservando intacta la asignación de usuarios a puestos (`User.locationId`, JWT, `GET /auth/me`) y manteniendo la pureza de la Arquitectura Hexagonal.

---

## 2. Auditoría del Estado Actual y Elementos Afectados

### 2.1. Componentes que Permanecen Intactos
- **Módulo `users`:**
  - `UserEntity.locationId` y `locationName`.
  - Validación de asignación por rol en `CreateUserUseCase` y `UpdateUserUseCase`:
    - `ADMIN`: sin puesto (`locationId: null`).
    - `ENCARGADO_ALMACEN`: vinculado a `ALMACEN_CENTRAL`.
    - `VENDEDOR` y `TECNICO`: requieren obligatoriamente un `PUESTO` activo.
  - Endpoints: `POST /users`, `GET /users`, `PATCH /users/:id`, `PATCH /users/me`.
  - Pruebas unitarias: `create-user.use-case.spec.ts`.
- **Módulo `auth`:**
  - `JwtTokenAdapter`: inclusión de `locationId` y `locationName` en el payload JWT.
  - `JwtStrategy`: propagación hacia `req.user`.
  - `GetProfileUseCase`: exposición de `locationId` y `locationName` en `GET /auth/me` y `GET /auth/profile`.
- **Módulo `locations`:**
  - `LocationEntity`, repositorio y controlador intactos.

---

### 2.2. Archivos a Eliminar (14 archivos)

| # | Archivo | Capa | Motivo de Eliminación |
|---|---|---|---|
| 1 | `src/modules/transfers/application/use-cases/create-transfer.use-case.ts` | Application | Caso de uso de creación de transferencias entre puestos (`ENTRE_PUESTOS`, `DRAFT`, `EN_TRANSITO`). |
| 2 | `src/modules/transfers/application/use-cases/update-draft-transfer.use-case.ts` | Application | Caso de uso de actualización de borradores (`DRAFT`). |
| 3 | `src/modules/transfers/application/use-cases/dispatch-transfer.use-case.ts` | Application | Caso de uso de despacho de transferencias (`DRAFT` $\rightarrow$ `EN_TRANSITO`). |
| 4 | `src/modules/transfers/application/use-cases/confirm-transfer.use-case.ts` | Application | Caso de uso de confirmación por escaneo (`EN_TRANSITO` $\rightarrow$ `COMPLETED`). |
| 5 | `src/modules/transfers/application/use-cases/cancel-transfer.use-case.ts` | Application | Caso de uso de anulación y reversión de transferencias (`CANCELLED`). |
| 6 | `src/modules/transfers/application/use-cases/transfer-lifecycle.use-case.spec.ts` | Application (Tests) | Pruebas unitarias del flujo multi-etapa eliminado. |
| 7 | `src/modules/transfers/application/dto/create-transfer-command.dto.ts` | Application (DTO) | DTO de entrada para creación de transferencia entre puestos. |
| 8 | `src/modules/transfers/application/dto/update-draft-transfer-command.dto.ts` | Application (DTO) | DTO de entrada para actualización de borrador. |
| 9 | `src/modules/transfers/application/dto/confirm-transfer-command.dto.ts` | Application (DTO) | DTO de entrada para confirmación con `scannedSerials`. |
| 10 | `src/modules/transfers/application/dto/cancel-transfer-command.dto.ts` | Application (DTO) | DTO de entrada para anulación con motivo. |
| 11 | `src/modules/transfers/infrastructure/adapters/in/http/dto/create-transfer.http-dto.ts` | Infrastructure (HTTP DTO) | DTO HTTP para `POST /transfers`. |
| 12 | `src/modules/transfers/infrastructure/adapters/in/http/dto/update-draft-transfer.http-dto.ts` | Infrastructure (HTTP DTO) | DTO HTTP para `PATCH /transfers/:id`. |
| 13 | `src/modules/transfers/infrastructure/adapters/in/http/dto/confirm-transfer.http-dto.ts` | Infrastructure (HTTP DTO) | DTO HTTP para `POST /transfers/:id/confirm`. |
| 14 | `src/modules/transfers/infrastructure/adapters/in/http/dto/cancel-transfer.http-dto.ts` | Infrastructure (HTTP DTO) | DTO HTTP para `POST /transfers/:id/cancel`. |

---

### 2.3. Archivos a Modificar (12 archivos)

#### 1. `prisma/schema.prisma`
- **`enum ItemStatus`:** Eliminar el valor `EN_TRANSITO` (valores válidos: `EN_STOCK`, `VENDIDO`, `SEGUNDA_MANO_PENDIENTE`, `EN_GARANTIA`, `DE_BAJA`).
- **`enum TransferType`:** Dejar únicamente `DIRECTO` (eliminar `ENTRE_PUESTOS`).
- **`enum TransferStatus`:** Dejar únicamente `COMPLETED` (eliminar `DRAFT`, `EN_TRANSITO`, `CANCELLED`).
- **`model User`:** Eliminar la relación inversa `transfersReceived InternalTransfer[] @relation("TransferReceivedBy")`. Mantener `transfersCreated`.
- **`model InternalTransfer`:**
  - Valores por defecto: `type TransferType @default(DIRECTO)`, `status TransferStatus @default(COMPLETED)`.
  - Eliminar columnas y relaciones:
    - `receivedById String?`
    - `receivedBy User? @relation("TransferReceivedBy", ...)`
    - `cancelReason String?`
    - `dispatchedAt DateTime?`
    - `receivedAt DateTime?`
  - Mantener: `id`, `code`, `type`, `status`, `fromLocationId`, `toLocationId`, `createdById`, `notes`, `createdAt`, `updatedAt`, `fromLocation`, `toLocation`, `createdBy`, `items`.

#### 2. `src/modules/hardware-items/domain/entities/hardware-item.entity.ts`
- Eliminar `'EN_TRANSITO'` del tipo `ItemStatusType`.
- Eliminar los métodos de transición: `dispatchTransfer()`, `confirmTransfer()`, `cancelTransfer()`.
- Mantener `transferDirect(newLocationId: string)`.

#### 3. `src/modules/hardware-items/application/use-cases/get-hardware-lifecycle.use-case.ts`
- En el formateo de eventos de bitácora (`formatDescription`), remover los casos obsoletos `TRANSFER_DISPATCHED`, `TRANSFER_CONFIRMED` y `TRANSFER_CANCELLED`.
- Conservar el caso `TRANSFER_DIRECT_COMPLETED`.

#### 4. `src/modules/transfers/domain/entities/internal-transfer.entity.ts`
- Simplificar los tipos:
  - `export type TransferTypeType = 'DIRECTO';`
  - `export type TransferStatusType = 'COMPLETED';`
- Eliminar de la clase y su constructor: `receivedById`, `receivedByName`, `cancelReason`, `dispatchedAt`, `receivedAt`.
- Eliminar métodos de ciclo de vida obsoleto: `createDraft()`, `createDispatched()`, `updateDraft()`, `dispatch()`, `confirm()`, `cancel()`.
- Mantener y ajustar el método factoría `createDirect()`.

#### 5. `src/modules/transfers/domain/ports/out/transfer-repository.port.ts`
- Limpiar `TransferFilterOptions` (remover filtros innecesarios de `status` y `type`).
- Eliminar el método `updateItems()` (solo se usaba para actualizar borradores).

#### 6. `src/modules/transfers/infrastructure/adapters/out/persistence/transfer.mapper.ts`
- Eliminar `receivedBy` de la interfaz `PrismaTransferWithRelations`.
- En `toDomain()`, mapear únicamente los campos vigentes, omitiendo `receivedById`, `receivedByName`, `cancelReason`, `dispatchedAt`, `receivedAt`.

#### 7. `src/modules/transfers/infrastructure/adapters/out/persistence/prisma-transfer.repository.ts`
- Eliminar `receivedBy` de `standardIncludes`.
- En `create()`, eliminar la inserción de `receivedById`, `cancelReason`, `dispatchedAt`, `receivedAt`.
- En `update()`, depurar campos obsoletos.
- Eliminar la implementación de `updateItems()`.

#### 8. `src/modules/transfers/application/dto/transfer-response.dto.ts`
- Remover de `TransferResponseDto`: `receivedById`, `receivedByName`, `cancelReason`, `dispatchedAt`, `receivedAt`.

#### 9. `src/modules/transfers/application/dto/query-transfers.dto.ts` y `query-transfers.http-dto.ts`
- Remover o simplificar los filtros `status` y `type`.

#### 10. `src/modules/transfers/application/use-cases/create-direct-transfer.use-case.ts`
- **Control de Acceso Estricto (RBAC):**
  - Restringir la ejecución exclusivamente a `Role.ADMIN` y `Role.ENCARGADO_ALMACEN`.
  - Si un usuario con rol `Role.VENDEDOR` o `Role.TECNICO` intenta ejecutarlo, lanzar `ForbiddenException('Solo ADMIN y ENCARGADO_ALMACEN pueden ejecutar traslados directos')`.
- Validar extremos: `ALMACEN_CENTRAL <-> PUESTO` (rechazar `PUESTO -> PUESTO` o `ALMACEN_CENTRAL -> ALMACEN_CENTRAL`).
- Mapear el DTO de respuesta sin los campos eliminados.

#### 11. `src/modules/transfers/application/use-cases/get-transfers.use-case.ts` y `get-transfer-detail.use-case.ts`
- Remover los campos eliminados del retorno de `TransferResponseDto` y `TransferDetailResponseDto`.
- Preservar la regla de seguridad:
  - `ADMIN` y `ENCARGADO_ALMACEN`: ven todas las transferencias.
  - `VENDEDOR` y `TECNICO`: se limita automáticamente a transferencias donde su `req.user.locationId` sea origen o destino. En `get-transfer-detail`, arrojar `403 Forbidden` si no coincide.

#### 12. `src/modules/transfers/infrastructure/adapters/in/http/transfers.controller.ts` y `transfers.module.ts`
- Eliminar los 5 endpoints anulados:
  - `POST /transfers`
  - `PATCH /transfers/:id`
  - `POST /transfers/:id/dispatch`
  - `POST /transfers/:id/confirm`
  - `POST /transfers/:id/cancel`
- Mantener los 3 endpoints vigentes:
  - `POST /transfers/direct`: Anotado con `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`.
  - `GET /transfers`: Anotado con `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)`.
  - `GET /transfers/:id`: Anotado con `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)`.
- En `transfers.module.ts`: remover de `providers` y `exports` los 5 casos de uso eliminados.

---

## 3. Plan de Migración de Base de Datos (PostgreSQL / Prisma)

Dado que PostgreSQL maneja enums fuertemente tipados, modificar o eliminar valores de un enum (`EN_TRANSITO` en `ItemStatus`, `ENTRE_PUESTOS` en `TransferType`, `DRAFT`, `EN_TRANSITO`, `CANCELLED` en `TransferStatus`) requiere sincronizar la base de datos de manera controlada.

### Estrategia de Sincronización:
1. Actualizar `prisma/schema.prisma` con las definiciones limpias.
2. Si existen registros previos con los estados antiguos, actualizarlos o depurarlos mediante un script SQL puntual antes de aplicar el cambio de esquema:
   - Convertir cualquier registro existente en `internal_transfers` a `type = 'DIRECTO'` y `status = 'COMPLETED'`.
   - Asegurar que ningún `hardware_items` tenga `status = 'EN_TRANSITO'` (revertir a `'EN_STOCK'`).
3. Ejecutar `npx prisma validate`.
4. Ejecutar `npx prisma db push --accept-data-loss`.
5. Ejecutar `npx prisma generate` para regenerar el cliente Prisma v5.22.0.

---

## 4. Estrategia de Pruebas y Verificación

1. **Pruebas Unitarias de Distribución Directa (`create-direct-transfer.use-case.spec.ts`):**
   - Verificar rechazo con `403 Forbidden` cuando `VENDEDOR` o `TECNICO` intentan ejecutar el traslado directo.
   - Verificar éxito cuando `ADMIN` o `ENCARGADO_ALMACEN` ejecutan el traslado directo.
   - Verificar rechazo con `400 Bad Request` ante series duplicadas o catálogos duplicados.
   - Verificar rechazo con `400 Bad Request` si el traslado no involucra `Almacén Central <-> Puesto`.
   - Verificar transferencia atómica: actualización de ubicación de serializados en `EN_STOCK`, deducción y adición en `QuantityStock` (preservando `costPrice` y `salePrice` en destino) y emisión del log `TRANSFER_DIRECT_COMPLETED`.
2. **Suite Completa de Pruebas:**
   - Ejecutar `npm test` asegurando que todos los tests del repositorio pasen al 100%.
3. **Verificación de Compilación y Pureza Hexagonal:**
   - Ejecutar `npm run build` verificando 0 errores de compilación TypeScript.
   - Auditar que `domain/` y `application/` contengan 0 imports de infraestructura (`@prisma/client`, `@nestjs/swagger`, adaptadores).

---

## 5. Actualización de Contratos de API (`@specs/API_CONTRACTS.md`)

- Remover la sección completa del Flujo B (Borradores, Despacho, Confirmación y Cancelación).
- Actualizar `POST /transfers/direct`:
  - Roles autorizados: Exclusivamente `ADMIN` y `ENCARGADO_ALMACEN`.
  - Ejemplo de request y response JSON actualizado.
- Actualizar `GET /transfers` y `GET /transfers/:id`:
  - Explicar alcance por rol (`VENDEDOR` / `TECNICO` filtrados por su puesto).
  - Estructura JSON de respuesta sin los campos obsoletos.
- Actualizar la tabla resumen de endpoints de la Fase 2 en `API_CONTRACTS.md`.
