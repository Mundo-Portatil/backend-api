# Tareas de Implementación — Fase 2 (Ajustada): Distribución Directa de Almacén (M3)

Seguir estrictamente el orden secuencial definido a continuación, respetando la Arquitectura Monolito Modular Hexagonal (`@specs/CONSTITUTION.md`) y el plan técnico (`@specs/fase_2_logistica_interna/plan.md`).

---

## Fase 2.1: Depuración de Base de Datos y Prisma Schema
- [x] **Tarea 2.1.1 — Migración Previa de Datos (SQL)**: Si existen datos con enums antiguos en la base de datos, ejecutar script de sanitización (`UPDATE hardware_items SET status = 'EN_STOCK' WHERE status = 'EN_TRANSITO'; UPDATE internal_transfers SET type = 'DIRECTO', status = 'COMPLETED';`).
- [x] **Tarea 2.1.2 — Modificar `prisma/schema.prisma`**:
  - Eliminar valor `EN_TRANSITO` de `enum ItemStatus`.
  - Dejar únicamente `DIRECTO` en `enum TransferType`.
  - Dejar únicamente `COMPLETED` en `enum TransferStatus`.
  - Eliminar de `model User` la relación `transfersReceived`.
  - En `model InternalTransfer`, cambiar `@default(DIRECTO)` y `@default(COMPLETED)`, eliminar columnas `receivedById`, `cancelReason`, `dispatchedAt`, `receivedAt`, y la relación `receivedBy`.
- [x] **Tarea 2.1.3 — Validar y Sincronizar Prisma**:
  - Ejecutar `npx prisma validate`.
  - Ejecutar `npx prisma db push --accept-data-loss`.
  - Ejecutar `npx prisma generate` (respetando la versión Prisma v5.22.0 instalada).

---

## Fase 2.2: Depuración de Capa de Dominio
- [x] **Tarea 2.2.1 — Limpiar `HardwareItemEntity`**:
  - En `src/modules/hardware-items/domain/entities/hardware-item.entity.ts`, remover `'EN_TRANSITO'` de `ItemStatusType`.
  - Eliminar métodos `dispatchTransfer()`, `confirmTransfer()` y `cancelTransfer()`.
  - Conservar `transferDirect(newLocationId: string)`.
- [x] **Tarea 2.2.2 — Limpiar `InternalTransferEntity`**:
  - En `src/modules/transfers/domain/entities/internal-transfer.entity.ts`, fijar `TransferTypeType = 'DIRECTO'` y `TransferStatusType = 'COMPLETED'`.
  - Remover de la clase y constructor `receivedById`, `receivedByName`, `cancelReason`, `dispatchedAt`, `receivedAt`.
  - Eliminar métodos `createDraft()`, `createDispatched()`, `updateDraft()`, `dispatch()`, `confirm()`, `cancel()`.
  - Actualizar factoría `createDirect()` con los campos vigentes.
- [x] **Tarea 2.2.3 — Limpiar Puerto `TransferRepositoryPort`**:
  - En `src/modules/transfers/domain/ports/out/transfer-repository.port.ts`, eliminar el método `updateItems()`.
  - Limpiar filtros de `TransferFilterOptions`.

---

## Fase 2.3: Depuración y Refactorización de Capa de Aplicación
- [x] **Tarea 2.3.1 — Eliminar Casos de Uso y DTOs Obsoletos**:
  - Eliminar `src/modules/transfers/application/use-cases/create-transfer.use-case.ts`.
  - Eliminar `src/modules/transfers/application/use-cases/update-draft-transfer.use-case.ts`.
  - Eliminar `src/modules/transfers/application/use-cases/dispatch-transfer.use-case.ts`.
  - Eliminar `src/modules/transfers/application/use-cases/confirm-transfer.use-case.ts`.
  - Eliminar `src/modules/transfers/application/use-cases/cancel-transfer.use-case.ts`.
  - Eliminar `src/modules/transfers/application/dto/create-transfer-command.dto.ts`.
  - Eliminar `src/modules/transfers/application/dto/update-draft-transfer-command.dto.ts`.
  - Eliminar `src/modules/transfers/application/dto/confirm-transfer-command.dto.ts`.
  - Eliminar `src/modules/transfers/application/dto/cancel-transfer-command.dto.ts`.
- [x] **Tarea 2.3.2 — Refactorizar `CreateDirectTransferUseCase`**:
  - En `src/modules/transfers/application/use-cases/create-direct-transfer.use-case.ts`, restringir la ejecución estrictamente a `Role.ADMIN` y `Role.ENCARGADO_ALMACEN` (lanzar `ForbiddenException` si el rol es `VENDEDOR` o `TECNICO`).
  - Actualizar el mapeo de `TransferDetailResponseDto` removiendo los campos eliminados.
- [x] **Tarea 2.3.3 — Actualizar DTOs de Respuesta y Consulta**:
  - En `src/modules/transfers/application/dto/transfer-response.dto.ts`, remover `receivedById`, `receivedByName`, `cancelReason`, `dispatchedAt`, `receivedAt`.
  - En `src/modules/transfers/application/dto/query-transfers.dto.ts`, remover `status` y `type`.
- [x] **Tarea 2.3.4 — Refactorizar Casos de Uso de Consulta**:
  - En `src/modules/transfers/application/use-cases/get-transfers.use-case.ts`, actualizar el mapeo omitiendo campos obsoletos y manteniendo el filtrado por `user.locationId` para `VENDEDOR` y `TECNICO`.
  - En `src/modules/transfers/application/use-cases/get-transfer-detail.use-case.ts`, actualizar el mapeo omitiendo campos obsoletos y asegurando la validación de pertenencia por puesto para `VENDEDOR` y `TECNICO`.
- [x] **Tarea 2.3.5 — Limpiar Bitácora de Hoja de Vida**:
  - En `src/modules/hardware-items/application/use-cases/get-hardware-lifecycle.use-case.ts`, remover los casos `TRANSFER_DISPATCHED`, `TRANSFER_CONFIRMED` y `TRANSFER_CANCELLED`, manteniendo `TRANSFER_DIRECT_COMPLETED`.

---

## Fase 2.4: Depuración y Refactorización de Capa de Infraestructura
- [x] **Tarea 2.4.1 — Eliminar DTOs HTTP Obsoletos**:
  - Eliminar `src/modules/transfers/infrastructure/adapters/in/http/dto/create-transfer.http-dto.ts`.
  - Eliminar `src/modules/transfers/infrastructure/adapters/in/http/dto/update-draft-transfer.http-dto.ts`.
  - Eliminar `src/modules/transfers/infrastructure/adapters/in/http/dto/confirm-transfer.http-dto.ts`.
  - Eliminar `src/modules/transfers/infrastructure/adapters/in/http/dto/cancel-transfer.http-dto.ts`.
- [x] **Tarea 2.4.2 — Limpiar DTO HTTP de Consulta**:
  - En `src/modules/transfers/infrastructure/adapters/in/http/dto/query-transfers.http-dto.ts`, remover los campos `status` y `type`.
- [x] **Tarea 2.4.3 — Actualizar Mapper y Repositorio de Persistencia**:
  - En `src/modules/transfers/infrastructure/adapters/out/persistence/transfer.mapper.ts`, eliminar `receivedBy` y los campos obsoletos.
  - En `src/modules/transfers/infrastructure/adapters/out/persistence/prisma-transfer.repository.ts`, eliminar `receivedBy` de `standardIncludes`, remover campos obsoletos en `create()` y `update()`, y eliminar `updateItems()`.
- [x] **Tarea 2.4.4 — Refactorizar Controlador HTTP y Módulo NestJS**:
  - En `src/modules/transfers/infrastructure/adapters/in/http/transfers.controller.ts`:
    - Eliminar los endpoints `POST /transfers`, `PATCH /transfers/:id`, `POST /transfers/:id/dispatch`, `POST /transfers/:id/confirm`, `POST /transfers/:id/cancel`.
    - En `POST /transfers/direct`, restringir los roles a `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN)`.
    - Conservar `GET /transfers` y `GET /transfers/:id` con `@Roles(Role.ADMIN, Role.ENCARGADO_ALMACEN, Role.VENDEDOR, Role.TECNICO)`.
    - Limpiar constructor y dependencias inyectadas.
  - En `src/modules/transfers/transfers.module.ts`:
    - Desregistrar los 5 casos de uso eliminados de `providers` y `exports`.

---

## Fase 2.5: Pruebas Unitarias y Verificación
- [x] **Tarea 2.5.1 — Eliminar Test Obsoleto**:
  - Eliminar `src/modules/transfers/application/use-cases/transfer-lifecycle.use-case.spec.ts`.
- [x] **Tarea 2.5.2 — Actualizar Test de Traslado Directo**:
  - En `src/modules/transfers/application/use-cases/create-direct-transfer.use-case.spec.ts`, verificar:
    - Rechazo con `403 Forbidden` si `VENDEDOR` o `TECNICO` intentan ejecutar el traslado directo.
    - Éxito si `ADMIN` o `ENCARGADO_ALMACEN` ejecutan el traslado directo.
    - Rechazo con `400 Bad Request` por duplicados en `hardwareItemIds` o `quantities`.
    - Verificación atómica de inventario y evento `TRANSFER_DIRECT_COMPLETED`.
- [x] **Tarea 2.5.3 — Ejecutar Suite de Pruebas**:
  - Ejecutar `npm test` verificando que pasen al 100% todos los tests unitarios.
- [x] **Tarea 2.5.4 — Compilación y Verificación Hexagonal**:
  - Ejecutar `npm run build` verificando 0 errores de TypeScript.
  - Verificar 0 imports de infraestructura en `domain/` y `application/`.

---

## Fase 2.6: Actualización de Contratos de API
- [x] **Tarea 2.6.1 — Actualizar `@specs/API_CONTRACTS.md`**:
  - En la sección del Módulo M3 (Logística Interna y Traslados):
    - Eliminar toda la documentación de Flujo B (`POST /transfers`, `PATCH /transfers/:id`, `POST /transfers/:id/dispatch`, `POST /transfers/:id/confirm`, `POST /transfers/:id/cancel`).
    - Actualizar `POST /transfers/direct` documentando roles exclusivos (`ADMIN`, `ENCARGADO_ALMACEN`), cuerpo JSON y respuesta.
    - Actualizar `GET /transfers` y `GET /transfers/:id` con la estructura de respuesta limpia y el comportamiento de filtrado por puesto para `VENDEDOR` y `TECNICO`.
    - Actualizar la tabla resumen de endpoints de la Fase 2 en `API_CONTRACTS.md`.
