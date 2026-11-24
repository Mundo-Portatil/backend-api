# Especificación Técnica — Fase 2 (Ajustada): Asignación de Puestos a Usuarios y Distribución de Almacén (M3)

## 1. Objetivo y Alcance
Refactorizar y consolidar la Fase 2 en `backend-api` bajo la Arquitectura Monolito Modular Hexagonal (`@specs/CONSTITUTION.md`):
1. **Asignación de Ubicación a Usuarios (`User.locationId` — Mantener intacto):**
   - `ADMIN` opera sin puesto fijo (`locationId: null`).
   - `ENCARGADO_ALMACEN` se vincula por defecto al `ALMACEN_CENTRAL` activo.
   - `VENDEDOR` y `TECNICO` requieren obligatoriamente una ubicación activa de tipo `PUESTO` al crearse o editarse (`POST /users`, `PATCH /users/:id`), exponiendo `locationId` y `locationName` en el JWT (`req.user`), `POST /auth/login` y `GET /auth/me`.
2. **Distribución Directa de Mercadería (`Almacén Central <-> Puesto`):**
   - El módulo `src/modules/transfers/` queda enfocado **exclusivamente** en la distribución directa de mercadería desde el `ALMACEN_CENTRAL` hacia los `PUESTO` (y retorno directo `PUESTO -> ALMACEN_CENTRAL` para devoluciones) ejecutada por `ENCARGADO_ALMACEN` y `ADMIN`.
   - **Se eliminan por completo** las transferencias entre puestos (`ENTRE_PUESTOS`), los borradores (`DRAFT`), el estado intermedio `EN_TRANSITO`, la cancelación (`CANCELLED`) y los endpoints asociados (`POST /transfers`, `PATCH /transfers/:id`, `dispatch`, `confirm`, `cancel`), ya que los cruces rápidos de mercadería entre puestos durante una venta ("producto de otro puesto") se resolverán dentro del módulo POS en la Fase 4.

---

## 2. Reglas de Negocio de Distribución Directa (`M3`)

### 2.1. Ejecución de Distribución (`POST /transfers/direct`)
- **Roles Permitidos:** Exclusivamente `ADMIN` y `ENCARGADO_ALMACEN` (`403 Forbidden` para `VENDEDOR` y `TECNICO`).
- **Validación de Ubicaciones:**
  - `fromLocationId` y `toLocationId` deben ser ubicaciones activas y distintas.
  - Uno de los extremos debe ser de tipo `ALMACEN_CENTRAL` y el otro debe ser de tipo `PUESTO` (rechazar `PUESTO -> PUESTO` o `ALMACEN_CENTRAL -> ALMACEN_CENTRAL` con `400 Bad Request`).
- **Validación de Ítems:**
  - Debe enviarse al menos un ítem serializado (`hardwareItemIds`) o un ítem por cantidad (`quantities`).
  - `hardwareItemIds` no puede contener IDs duplicados (`400 Bad Request`).
  - `quantities` no puede contener `catalogId` duplicados y cada `quantity` debe ser entero `>= 1` (`400 Bad Request`).
- **Transacción Atómica (`TransactionManagerPort.runInTransaction`):**
  - Genera código correlativo único `TR-XXXXXX`.
  - **Equipos serializados (`hardwareItemIds`):** Verifica que cada unidad exista, tenga `status === 'EN_STOCK'` y pertenezca actualmente a `fromLocationId` (`400` / `409` si no cumple). Actualiza `locationId = toLocationId` manteniendo `status = 'EN_STOCK'`.
  - **Productos por cantidad (`quantities`):** Verifica saldo suficiente en `QuantityStock` de `fromLocationId` (`quantity >= requested`). Descuenta en origen y suma (`upsert`) en destino, heredando `costPrice` y `salePrice` del registro de origen si el destino aún no tenía saldo de ese producto.
  - Guarda `InternalTransfer` con `type = 'DIRECTO'` y `status = 'COMPLETED'`, junto con sus `InternalTransferItem[]`.
  - Registra evento `TRANSFER_DIRECT_COMPLETED` en `AuditLogPort` incluyendo `serials` y `hardwareItemIds` para que se refleje automáticamente en la Hoja de Vida (`GET /hardware-items/:id/lifecycle`).

### 2.2. Consulta de Guías de Distribución (`GET /transfers` y `GET /transfers/:id`)
- **Roles Permitidos:** `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO`.
- **Ámbito por Rol:**
  - `ADMIN` y `ENCARGADO_ALMACEN`: Visualizan todas las guías de distribución del sistema.
  - `VENDEDOR` y `TECNICO`: Visualizan únicamente las guías de distribución donde `fromLocationId` o `toLocationId` coincida con su `req.user.locationId`.
- **Filtros en `GET /transfers`:** `fromLocationId`, `toLocationId`, `startDate`, `endDate`, `search` (búsqueda por código `TR-XXXXXX`), `page`, `limit`.
- **Detalle en `GET /transfers/:id`:** Acepta UUID o código legible `TR-XXXXXX` y retorna cabecera + listado detallado de ítems (`catalogId`, `sku`, `brand`, `model`, `hardwareItemId`, `serialNumber`, `quantity`).

---

## 3. Cambios en Base de Datos (`prisma/schema.prisma`)

1. **`enum ItemStatus`:** Eliminar `EN_TRANSITO` (dejar `EN_STOCK`, `VENDIDO`, `SEGUNDA_MANO_PENDIENTE`, `EN_GARANTIA`, `DE_BAJA`).
2. **`enum TransferType`:** Dejar únicamente `DIRECTO`.
3. **`enum TransferStatus`:** Dejar únicamente `COMPLETED`.
4. **`model User`:** Mantener `locationId String?` y `transfersCreated InternalTransfer[] @relation("TransferCreatedBy")`. Eliminar `transfersReceived`.
5. **`model InternalTransfer`:**
   - Conservar: `id`, `code`, `type` (`@default(DIRECTO)`), `status` (`@default(COMPLETED)`), `fromLocationId`, `toLocationId`, `createdById`, `notes`, `createdAt`, `updatedAt`, y relaciones `fromLocation`, `toLocation`, `createdBy`, `items`.
   - Eliminar: `receivedById`, `receivedBy`, `cancelReason`, `dispatchedAt`, `receivedAt`.
6. **`model InternalTransferItem`:** Mantener sin cambios (`id`, `transferId`, `catalogId`, `hardwareItemId`, `quantity`).

---

## 4. Criterios de Aceptación
1. La asignación de puestos a usuarios (`User.locationId`) y su propagación en JWT / `GET /auth/me` sigue operando sin regresiones.
2. El esquema Prisma y el módulo `src/modules/transfers/` quedan limpios de código muerto (`ENTRE_PUESTOS`, `DRAFT`, `EN_TRANSITO`, `CANCELLED`).
3. Solo `ADMIN` y `ENCARGADO_ALMACEN` pueden ejecutar `POST /transfers/direct`, mientras `VENDEDOR` y `TECNICO` pueden consultar las guías recibidas por su puesto en `GET /transfers` y `GET /transfers/:id`.
4. `npx prisma validate`, `npx prisma db push --accept-data-loss`, `npx prisma generate`, `npm test` y `npm run build` pasan con **0 errores**.
5. `@specs/API_CONTRACTS.md` queda actualizado reflejando únicamente los contratos vigentes.