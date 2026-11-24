# Especificación Técnica — Fase 2: Asignación de Puestos a Usuarios y Módulo de Logística Interna (M3)

## 1. Objetivo y Alcance
Implementar en `backend-api` la asignación de ubicación física (`locationId`) al personal y el módulo completo de **Logística Interna y Movimientos (`M3`)**:
1. **Asignación de Ubicación a Usuarios (Fase 0 / M5):** Permitir que `ADMIN` asigne una ubicación (`Location`) a cada usuario al crearlo o editarlo (`POST /users`, `PATCH /users/:id`), exponiendo `locationId` y `locationName` en el token JWT (`req.user`) y en `GET /auth/me`.
2. **Distribución / Traslado Directo (`Almacén Central <-> Puesto`):** Movimiento inmediato (`COMPLETED` sin paso de confirmación) para abastecer puestos desde el Almacén Central o retornar mercadería al almacén.
3. **Transferencias entre Puestos (`Puesto Origen -> Puesto Destino`):** Flujo completo con borrador sin bloqueo (`DRAFT`), despacho (`EN_TRANSITO`), confirmación de recepción con escaneo obligatorio de series (`COMPLETED`) y cancelación (`CANCELLED`).
4. **Trazabilidad M6 (`AuditLog`):** Registro inmutable en bitácora y hoja de vida del hardware en cada operación logística.

---

## 2. Reglas de Negocio

### 2.1. Asignación de Ubicación por Rol (`User.locationId`)
- **`ADMIN`:** `locationId` es `null` (acceso global a todas las ubicaciones; si se envía `locationId`, se ignora o se guarda `null`).
- **`ENCARGADO_ALMACEN`:** Si no se especifica `locationId` al crear/editar, el backend lo vincula automáticamente a la ubicación de tipo `ALMACEN_CENTRAL`. Si se especifica, debe existir y estar activa.
- **`VENDEDOR` y `TECNICO`:** Requieren obligatoriamente un `locationId` válido correspondiente a una ubicación activa de tipo `PUESTO` al crear o actualizar su cuenta (`400 Bad Request` si falta o si la ubicación está inactiva).
- **Sesión y JWT:** `POST /auth/login` y `GET /auth/me` incluyen `locationId` y `locationName` dentro del objeto `user`. El guard JWT inyecta `locationId` en `req.user`.

### 2.2. Flujo A — Traslado Directo (`Almacén Central <-> Puesto`)
- **Endpoint:** `POST /transfers/direct`
- **Permisos:**
  - `ADMIN` y `ENCARGADO_ALMACEN`: Pueden ejecutar traslados directos entre `ALMACEN_CENTRAL` y cualquier `PUESTO` activo (en ambos sentidos).
  - `VENDEDOR` y `TECNICO`: Solo pueden ejecutar traslados directos donde uno de los extremos sea `ALMACEN_CENTRAL` y el otro sea exactamente su `req.user.locationId` (`403 Forbidden` si involucra un puesto ajeno).
- **Regla de ejecución (`prisma.$transaction`):**
  - El traslado nace directamente en estado `COMPLETED` con código correlativo `TR-XXXXXX`.
  - **Ítems con serie (`hardwareItemIds`):** Verifica que cada unidad exista, pertenezca al `catalogId` indicado, tenga estado `EN_STOCK` y esté actualmente en `fromLocationId` (`409 Conflict` o `400 Bad Request` si no cumple). Actualiza `locationId = toLocationId` manteniendo `status = EN_STOCK`.
  - **Ítems por cantidad (`quantity` sin series):** Verifica saldo suficiente en `QuantityStock` de `fromLocationId`, descuenta en origen y suma (upsert) en `toLocationId` preservando `costPrice` y `salePrice`.
  - Registra evento en `AuditLog` (`TRANSFER_DIRECT_COMPLETED`) con detalle de origen, destino, cantidades y series trasladadas.

### 2.3. Flujo B — Transferencias entre Puestos (`Puesto Origen -> Puesto Destino`)
- **Estados del ciclo de vida:** `DRAFT` -> `EN_TRANSITO` -> `COMPLETED` (o `CANCELLED` desde `DRAFT` o `EN_TRANSITO`).
- **Creación (`POST /transfers`):**
  - Permite crear en modo **`DRAFT`** (borrador rápido sin bloquear pantalla ni descontar stock aún) o despachar de inmediato en modo **`EN_TRANSITO`**.
  - Para `VENDEDOR` y `TECNICO`, `fromLocationId` se toma automáticamente de su `req.user.locationId` (rechazando con `403` si intentan enviar desde otro puesto). Para `ADMIN` y `ENCARGADO_ALMACEN`, `fromLocationId` puede enviarse explícitamente.
  - `fromLocationId` y `toLocationId` deben ser ubicaciones activas y distintas (`400 Bad Request` si son iguales).
- **Edición de Borrador (`PATCH /transfers/:id`):**
  - Solo permitido cuando `status === 'DRAFT'`. Permite actualizar `toLocationId`, `notes` y reemplazar la lista de ítems (`items`).
- **Despacho (`POST /transfers/:id/dispatch`):**
  - Solo permitido cuando `status === 'DRAFT'`.
  - Dentro de `prisma.$transaction`, valida disponibilidad real en `fromLocationId`:
    - Las series pasan de `EN_STOCK` a **`EN_TRANSITO`** (siguen vinculadas a `fromLocationId` hasta que el destino confirme, pero bloqueadas para venta).
    - Las cantidades sin serie se descuentan de `QuantityStock` en `fromLocationId`.
  - Actualiza `status = 'EN_TRANSITO'`, `dispatchedAt = now()` y registra en `AuditLog` (`TRANSFER_DISPATCHED`).
- **Confirmación de Recepción (`POST /transfers/:id/confirm`):**
  - Solo permitido cuando `status === 'EN_TRANSITO'`.
  - **Permiso receptor:** `req.user.locationId === transfer.toLocationId` (o `ADMIN` / `ENCARGADO_ALMACEN`).
  - **Escaneo obligatorio de series:** El payload recibe `scannedSerials: string[]`. El backend valida que el conjunto de series escaneadas coincida exactamente con las series incluidas en la transferencia (sin faltantes ni series ajenas; caso contrario responde `400 Bad Request` detallando las series faltantes o sobrantes).
  - Dentro de `prisma.$transaction`: - Actualiza cada serie a `status = 'EN_STOCK'` y `locationId = transfer.toLocationId`. - Acredita las cantidades sin serie en `QuantityStock` de `transfer.toLocationId`. - Marca `status = 'COMPLETED'`, `receivedById = req.user.id`, `receivedAt = now()`. - Registra en `AuditLog` (`TRANSFER_CONFIRMED`) deslindando responsabilidad hacia el receptor. - **Cancelación (`POST /transfers/:id/cancel`):** - Permitido en `DRAFT` o `EN_TRANSITO` (con `reason` opcional/obligatorio si está en tránsito). - Si estaba en `DRAFT`: solo cambia a `CANCELLED`. - Si estaba en `EN_TRANSITO`: dentro de `prisma.$transaction`, devuelve las series a `status = 'EN_STOCK'` en `fromLocationId` y reintegra `QuantityStock` en `fromLocationId`.
  - Registra en `AuditLog` (`TRANSFER_CANCELLED`).

---

## 3. Cambios en Base de Datos (`prisma/schema.prisma`)

1. **Enum `ItemStatus`:** Agregar `EN_TRANSITO`.
2. **Nuevos Enums:**
   - `TransferType`: `DIRECTO`, `ENTRE_PUESTOS`
   - `TransferStatus`: `DRAFT`, `EN_TRANSITO`, `COMPLETED`, `CANCELLED`
3. **Modelo `User`:** Agregar campo opcional `locationId String?` con relación a `Location` (`@relation(fields: [locationId], references: [id])`).
4. **Modelo `InternalTransfer`:**
   - `id String @id @default(uuid())`
   - `code String @unique` (formato `TR-XXXXXX`)
   - `type TransferType`
   - `status TransferStatus`
   - `fromLocationId String` (relación `Location`)
   - `toLocationId String` (relación `Location`)
   - `createdById String` (relación `User`)
   - `receivedById String?` (relación `User`)
   - `notes String?`
   - `cancelReason String?`
   - `dispatchedAt DateTime?`
   - `receivedAt DateTime?`
   - `createdAt DateTime @default(now())`
   - `updatedAt DateTime @updatedAt`
   - `items InternalTransferItem[]`
5. **Modelo `InternalTransferItem`:**
   - `id String @id @default(uuid())`
   - `transferId String` (relación `InternalTransfer` con `onDelete: Cascade`)
   - `catalogId String` (relación `ProductCatalog`)
   - `hardwareItemId String?` (relación `HardwareItem`, presente cuando es unidad serializada)
   - `quantity Int @default(1)` (1 para serializados; N para productos por cantidad)

---

## 4. Criterios de Aceptación
1. `ADMIN` puede asignar y reasignar puestos (`locationId`) a vendedores y técnicos en `/users`, y el `locationId` viaja en el JWT y `GET /auth/me`.
2. Los traslados directos `Almacén <-> Puesto` actualizan ubicación y saldos atómicamente en una sola transacción.
3. Las transferencias entre puestos soportan creación en borrador (`DRAFT`), despacho (`EN_TRANSITO` bloqueando venta en origen), confirmación con escaneo obligatorio de todas las series (`COMPLETED`) y cancelación con reversión de stock (`CANCELLED`).
4. Todas las operaciones quedan registradas en `AuditLog` (M6) y son visibles en la hoja de vida de cada serie (`GET /hardware-items/:id/lifecycle`).
5. `npx prisma migrate dev`, `npm run build` y `npm test` pasan al 100%.