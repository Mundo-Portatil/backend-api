# Tareas de Implementación — Fase 2: Asignación de Puestos a Usuarios y Módulo de Logística Interna (M3)

## Fase 2.1: Modelo de Datos y Schema Prisma
- [x] **T2.1.1: Actualización de `prisma/schema.prisma`**
  - Agregar `EN_TRANSITO` a `enum ItemStatus`.
  - Crear `enum TransferType { DIRECTO, ENTRE_PUESTOS }`.
  - Alinear `enum TransferStatus { DRAFT, EN_TRANSITO, COMPLETED, CANCELLED }`.
  - Agregar `locationId String?` en `model User` con `@relation(fields: [locationId], references: [id])`.
  - Agregar relación inversa `users User[]` en `model Location`.
  - Reemplazar modelos `TransferRequest` y `TransferItem` por `InternalTransfer` y `InternalTransferItem` con campos y relaciones según `plan.md`.
- [x] **T2.1.2: Sincronización y Generación de Cliente Prisma**
  - Ejecutar `npx prisma validate` para verificar la sintaxis del esquema.
  - Ejecutar `npx prisma db push --accept-data-loss` contra Supabase.
  - Ejecutar `npx prisma generate` (respetando Prisma Client v5.22.0).

---

## Fase 2.2: Asignación de Ubicación a Usuarios y Autenticación
- [x] **T2.2.1: Capa de Dominio en `UsersModule`**
  - Actualizar `UserEntity` agregando `locationId: string | null` y `locationName: string | null = null`.
  - Actualizar método `create` y `sanitize()` para incluir `locationId` y `locationName`.
- [x] **T2.2.2: Capa de Aplicación en `UsersModule`**
  - Actualizar `create-user-command.dto.ts` y `update-user-command.dto.ts` con `locationId?: string | null`.
  - Actualizar `user-response.dto.ts` con `locationId: string | null` y `locationName: string | null`.
  - Actualizar `CreateUserUseCase`:
    - Inyectar `LOCATION_REPOSITORY` (`LocationRepositoryPort`).
    - Validar según rol:
      - `ADMIN` $\rightarrow$ forzar `locationId = null`.
      - `ENCARGADO_ALMACEN` $\rightarrow$ si no viene `locationId`, auto-asignar `ALMACEN_CENTRAL` activo; si viene, validar que exista y esté activo.
      - `VENDEDOR` y `TECNICO` $\rightarrow$ `locationId` obligatorio, debe existir, estar activo y ser de tipo `PUESTO`.
  - Actualizar `UpdateUserUseCase`:
    - Validar puesto según rol efectivo tras la edición aplicando las mismas reglas.
- [x] **T2.2.3: Capa de Infraestructura en `UsersModule`**
  - Actualizar `user.mapper.ts`: mapear `locationId` y `location?.name` en `toDomain`, `toPersistenceCreate` y `toPersistenceUpdate`.
  - Actualizar `prisma-user.repository.ts`: incluir relación `location: true` en consultas `findUnique` y `findMany`.
  - Actualizar `create-user.http-dto.ts` y `update-user.http-dto.ts` con `@ApiPropertyOptional()` y `@IsUUID('4')` para `locationId`.
  - Importar `LocationsModule` en `users.module.ts`.
- [x] **T2.2.4: Autenticación y JWT en `AuthModule`**
  - Actualizar `token-service.port.ts`: agregar `locationId: string | null` y `locationName?: string | null` en `JwtPayload`.
  - Actualizar `auth-response.dto.ts`: agregar `locationId` y `locationName` dentro del objeto `user`.
  - Actualizar `login.use-case.ts`: incluir `locationId` y `locationName` en el payload del token y en la respuesta.
  - Actualizar `get-profile.use-case.ts`: incluir `locationId` y `locationName` en `UserProfileDto`.
  - Actualizar `jwt.strategy.ts`: propagar `locationId` y `locationName` hacia `req.user`.
  - Actualizar `auth.controller.ts`: exponer endpoint `@Get('me')` (manteniendo `@Get('profile')` como alias).

---

## Fase 2.3: Capa de Dominio de `TransfersModule` (`src/modules/transfers/`)
- [x] **T2.3.1: Entidades de Dominio**
  - Crear `internal-transfer-item.entity.ts`: propiedades `id`, `transferId`, `catalogId`, `hardwareItemId`, `quantity`.
  - Crear `internal-transfer.entity.ts`:
    - Propiedades: `id`, `code`, `type`, `status`, `fromLocationId`, `toLocationId`, `createdById`, `receivedById`, `notes`, `cancelReason`, `dispatchedAt`, `receivedAt`, `createdAt`, `updatedAt`, `items`.
    - Métodos de dominio y validación de invariantes:
      - `static createDirect(...)`: inicializa en estado `COMPLETED` con fechas de despacho y recepción.
      - `static createDraft(...)`: inicializa en estado `DRAFT`.
      - `updateDraft(...)`: permite modificar destino, notas e ítems solo si está en `DRAFT`.
      - `dispatch(...)`: transiciona de `DRAFT` a `EN_TRANSITO`.
      - `confirm(...)`: transiciona de `EN_TRANSITO` a `COMPLETED`.
      - `cancel(...)`: transiciona a `CANCELLED` con `cancelReason`.
- [x] **T2.3.2: Puertos de Salida**
  - Crear `transfer-repository.port.ts`: interfaz `TransferRepositoryPort` con métodos `save`, `findById`, `findByCode`, `findAll`, `update`, `findDetail`.
  - Crear `transfer-code-generator.port.ts`: interfaz `TransferCodeGeneratorPort` con método `generateCode()`.
- [x] **T2.3.3: Actualización en `HardwareItemEntity`**
  - Agregar `EN_TRANSITO` en `ItemStatusType`.
  - Agregar métodos de dominio para traslados: `dispatchTransfer()`, `confirmTransfer()`, `cancelTransfer()`, `transferDirect()`.

---

## Fase 2.4: Capa de Aplicación de `TransfersModule`
- [x] **T2.4.1: DTOs Puros de Aplicación**
  - Crear `create-direct-transfer-command.dto.ts` y `create-transfer-command.dto.ts`.
  - Crear `update-draft-transfer-command.dto.ts`.
  - Crear `confirm-transfer-command.dto.ts` (con `scannedSerials: string[]`).
  - Crear `cancel-transfer-command.dto.ts` (con `reason?: string`).
  - Crear `transfer-response.dto.ts` y `transfer-detail-response.dto.ts`.
- [x] **T2.4.2: Caso de Uso de Traslado Directo (`CreateDirectTransferUseCase`)**
  - Validar permisos de rol: `ADMIN`/`ENCARGADO_ALMACEN` (cualquier puesto) vs `VENDEDOR`/`TECNICO` (solo su puesto asignado).
  - Validar que un extremo sea `ALMACEN_CENTRAL` y el otro `PUESTO`.
  - En transacción atómica (`TransactionManagerPort.runInTransaction`):
    - Validar y actualizar series a `toLocationId` manteniendo `status = EN_STOCK`.
    - Validar saldo suficiente en origen y trasladar stock cuantitativo (`QuantityStock`).
    - Guardar transferencia en estado `COMPLETED` con código `TR-XXXXXX`.
  - Registrar evento `TRANSFER_DIRECT_COMPLETED` en `AuditLogPort` con `serials` y `hardwareItemIds`.
- [x] **T2.4.3: Caso de Uso de Creación de Transferencia (`CreateTransferUseCase`)**
  - Fijar `fromLocationId = req.user.locationId` si es vendedor/técnico (rechazar con `403` si envía otro).
  - Si `status === 'DRAFT'`: guardar borrador sin modificar stock.
  - Si `status === 'EN_TRANSITO'`: ejecutar despacho inmediato en transacción.
- [x] **T2.4.4: Caso de Uso de Edición de Borrador (`UpdateDraftTransferUseCase`)**
  - Validar que la transferencia esté en `DRAFT` y que el usuario sea el creador o de la ubicación origen (o Admin/Almacén).
  - Reemplazar destino, notas e ítems.
- [x] **T2.4.5: Caso de Uso de Despacho (`DispatchTransferUseCase`)**
  - Validar que esté en `DRAFT`.
  - En transacción atómica:
    - Series: pasar de `EN_STOCK` a `EN_TRANSITO` (bloqueadas para venta en origen).
    - Cuantitativo: descontar de `QuantityStock` en origen.
    - Transferencia: marcar `EN_TRANSITO` con `dispatchedAt = now()`.
  - Registrar evento `TRANSFER_DISPATCHED` en `AuditLogPort`.
- [x] **T2.4.6: Caso de Uso de Confirmación de Recepción (`ConfirmTransferUseCase`)**
  - Validar que esté en `EN_TRANSITO`.
  - Validar permiso receptor: `req.user.locationId === transfer.toLocationId` (o Admin/Almacén).
  - Validar escaneo obligatorio de series: comparar `scannedSerials` contra las series esperadas en `items` (rechazar con `400` detallando faltantes o sobrantes).
  - En transacción atómica:
    - Series: pasar a `EN_STOCK` y cambiar `locationId = toLocationId`.
    - Cuantitativo: incrementar en destino mediante upsert en `QuantityStock`.
    - Transferencia: marcar `COMPLETED`, `receivedById = req.user.id`, `receivedAt = now()`.
  - Registrar evento `TRANSFER_CONFIRMED` en `AuditLogPort`.
- [x] **T2.4.7: Caso de Uso de Cancelación (`CancelTransferUseCase`)**
  - Validar que esté en `DRAFT` o `EN_TRANSITO`.
  - En transacción atómica:
    - Si estaba en `EN_TRANSITO`: devolver series a `EN_STOCK` en origen y re-acreditar `QuantityStock` en origen.
    - Transferencia: marcar `CANCELLED` y guardar `cancelReason`.
  - Registrar evento `TRANSFER_CANCELLED` en `AuditLogPort`.
- [x] **T2.4.8: Casos de Uso de Consulta (`GetTransfersUseCase` y `GetTransferDetailUseCase`)**
  - Implementar listado con filtros (`status`, `type`, `fromLocationId`, `toLocationId`, `search`, paginación).
  - Aplicar filtro automático de ubicación para `VENDEDOR` y `TECNICO` (solo ver transferencias donde su puesto sea origen o destino).
  - Implementar detalle con información de catálogo, series, ubicaciones y usuarios involucrados.

---

## Fase 2.5: Capa de Infraestructura de `TransfersModule`
- [x] **T2.5.1: Mappers y Generador de Códigos**
  - Crear `crypto-transfer-code-generator.adapter.ts` generando formato `TR-XXXXXX`.
  - Crear `transfer.mapper.ts` mapeando entre Prisma y `InternalTransferEntity`.
- [x] **T2.5.2: Repositorio Prisma (`PrismaTransferRepository`)**
  - Implementar métodos de `TransferRepositoryPort` con soporte de `tx?: unknown` (`Prisma.TransactionClient`).
  - Implementar consultas de listado con paginación y detalle enriquecido.
- [x] **T2.5.3: DTOs HTTP Swagger con Validación**
  - Crear `create-direct-transfer.http-dto.ts` y `create-transfer.http-dto.ts`.
  - Crear `update-draft-transfer.http-dto.ts`.
  - Crear `confirm-transfer.http-dto.ts` (con validación de `scannedSerials`).
  - Crear `cancel-transfer.http-dto.ts` (con `reason`).
  - Crear `query-transfers.http-dto.ts` (con filtros y paginación).
- [x] **T2.5.4: Controlador HTTP (`TransfersController`)**
  - Decorar con `@ApiTags('Transfers')`, `@ApiBearerAuth()`, `@UseGuards(JwtAuthGuard, RolesGuard)`.
  - Definir rutas:
    - `POST /transfers/direct`
    - `POST /transfers`
    - `GET /transfers`
    - `GET /transfers/:id`
    - `PATCH /transfers/:id`
    - `POST /transfers/:id/dispatch`
    - `POST /transfers/:id/confirm`
    - `POST /transfers/:id/cancel`
- [x] **T2.5.5: Ensamblado y Registro de Módulo**
  - Crear `transfers.module.ts` importando `LocationsModule`, `CatalogModule`, `HardwareItemsModule`, `QuantityStockModule`.
  - Registrar `TransfersModule` en `src/app.module.ts`.

---

## Fase 2.6: Pruebas Automatizadas
- [x] **T2.6.1: Pruebas de Usuarios y Asignación de Puestos**
  - Pruebas unitarias de validación de puesto según rol (`ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO`).
  - Verificación de inclusión de `locationId` y `locationName` en JWT y respuesta de login / perfil.
- [x] **T2.6.2: Pruebas de Traslado Directo y Transferencias entre Puestos**
  - Prueba de traslado directo inmediato `Almacén Central <-> Puesto` verificando actualización de inventario.
  - Prueba del ciclo completo: creación en `DRAFT`, edición, despacho con bloqueo en `EN_TRANSITO`, confirmación con validación de escaneo de series y cancelación con reversión de stock.
  - Prueba de validación de escaneo: rechazo cuando faltan o sobran series escaneadas.

---

## Fase 2.7: Integración Global, Verificación y Contratos de API
- [x] **T2.7.1: Verificación de Pureza Hexagonal y Compilación Estricta**
  - Validar que `domain/` y `application/` tengan 0 imports de infraestructura (`@prisma/client`, `@nestjs/swagger`, decoradores).
  - Ejecutar `npm run build` y asegurar **0 errores** de TypeScript.
- [x] **T2.7.2: Actualización de `@specs/API_CONTRACTS.md`**
  - Documentar `locationId` y `locationName` en los contratos de `/users` (`POST /users`, `PATCH /users/:id`, `GET /users`, `PATCH /users/me`).
  - Documentar `GET /auth/me` con respuesta JSON completa.
  - Documentar todos los endpoints del nuevo módulo `Transfers`:
    - `POST /transfers/direct`
    - `POST /transfers`
    - `PATCH /transfers/:id`
    - `POST /transfers/:id/dispatch`
    - `POST /transfers/:id/confirm`
    - `POST /transfers/:id/cancel`
    - `GET /transfers`
    - `GET /transfers/:id`
  - Incluir ejemplos JSON completos de petición y respuesta para cada flujo.
  - Actualizar la tabla resumen de rutas con los roles permitidos y ámbito de permisos.
