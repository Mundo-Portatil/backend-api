# Especificación Técnica — Fase 1.5: Empresas Remitentes/Facturadoras (`Company`) y Color por Serie

## 1. Objetivo y Alcance
Extender el modelo de inventario de `backend-api` manteniendo la Arquitectura Monolito Modular Hexagonal (`@specs/CONSTITUTION.md`) para soportar:
1. **Catálogo Dinámico de Empresas (`src/modules/companies/`):**
   - Gestión CRUD (con Soft Delete) de las empresas que envían mercadería y a cuyo nombre se emitirán las boletas en el futuro.
   - Campos obligatorios en creación: `name` (razón social única), `ruc` (11 dígitos numéricos, único) y `address` (dirección fiscal no vacía), más `active` (booleano, `true` por defecto).
2. **Color Específico por Unidad Serializada (`HardwareItem.color`):**
   - Mantener un único registro por modelo en `ProductCatalog` (sin duplicar filas para el mismo modelo).
   - Agregar el campo opcional `color` (`String?`) directamente en `HardwareItem` para diferenciar el color de cada número de serie dentro de un mismo modelo.
3. **Trazabilidad Obligatoria de Empresa en el Inventario (`companyId`):**
   - Todo ingreso de mercadería (serializada o por cantidad) exige obligatoriamente `companyId` vinculado a una empresa activa.
   - En un mismo ingreso (`POST /inventory/inbound`), un solo modelo (`catalogId`) puede dividirse entre distintas empresas y colores:
     - **Serializados:** Cada serie ingresada lleva su propio `{ serialNumber, color?, companyId }`.
     - **Cuantitativos:** `QuantityStock` desglosa las existencias por la clave única compuesta `(catalogId, locationId, companyId)`, permitiendo ingresar en un mismo lote unidades de un mismo modelo pertenecientes a distintas empresas sin duplicar el producto en `ProductCatalog`.
4. **Filtros y Consistencia Transversal (Catálogo, Existencias y Traslados):**
   - Agregar filtros por `companyId` (en `GET /hardware-items` y `GET /quantity-stock`) y por `color` (en `GET /hardware-items`).
   - Mantener la sincronización por empresa en `GET /catalog/:id`, `PATCH /hardware-items/:id/decommission`, `POST /hardware-items/approve-used` y en traslados (`POST /transfers/direct`).

---

## 2. Reglas de Negocio Detalladas

### 2.1. Módulo de Empresas (`src/modules/companies/`)
- **Roles Permitidos:**
  - `POST /companies` y `PATCH /companies/:id`: Exclusivo `ADMIN`, `ENCARGADO_ALMACEN`.
  - `GET /companies`: `ADMIN`, `ENCARGADO_ALMACEN`, `VENDEDOR`, `TECNICO`.
- **Validaciones:**
  - `name`: String no vacío, único (validación case-insensitive).
  - `ruc`: String obligatorio de exactamente 11 dígitos numéricos (`/^\d{11}$/`), único.
  - `address`: String obligatorio no vacío (dirección fiscal).
  - `active`: Booleano (default `true`). Desactivar (`active: false`) impide seleccionarla en nuevos ingresos, pero conserva su historial en existencias y ventas previas.
  - Emite eventos `CREATE_COMPANY` y `UPDATE_COMPANY` en `AuditLogPort`.

### 2.2. Ingreso Unificado de Mercadería (`POST /inventory/inbound`)
- **Ubicación Destino:** Sigue resolviendo automáticamente el `ALMACEN_CENTRAL` activo.
- **Líneas Serializadas (`hasSerialNumbers: true`):**
  - Reemplaza el arreglo plano de strings por `serialEntries`:
    ```json
    {
      "catalogId": "uuid-modelo",
      "quantity": 7,
      "hasSerialNumbers": true,
      "serialEntries": [
        { "serialNumber": "SN-001", "color": "Negro", "companyId": "uuid-empresa-a" },
        { "serialNumber": "SN-002", "color": "Plata", "companyId": "uuid-empresa-a" },
        { "serialNumber": "SN-003", "color": "Negro", "companyId": "uuid-empresa-b" }
      ],
      "costPrice": 1800,
      "salePrice": 2350
    }
    ```
  - **Validaciones:**
    - `serialEntries.length === quantity`.
    - Cada `serialNumber` es obligatorio, no vacío y único tanto dentro del lote como en toda la tabla `HardwareItem` (`409 Conflict` si ya existe).
    - Cada `companyId` es obligatorio (UUID) y debe pertenecer a una `Company` existente con `active === true` (`400 Bad Request` / `404 Not Found`).
    - `color` es opcional (`string`, trim aplicado; si viene vacío se guarda `null`).
  - **Sincronización Atómica:**
    - Crea los registros en `HardwareItem` con su `serialNumber`, `color` y `companyId`.
    - Agrupa las unidades por `(catalogId, locationId, companyId)` e incrementa `QuantityStock` en la cantidad exacta correspondiente a cada empresa.
- **Líneas por Cantidad (`hasSerialNumbers: false`):**
  - Exige `companyId` (UUID obligatorio de una `Company` activa) en cada ítem de `items[]`.
  - Si llegan 7 unidades del mismo modelo (3 de Empresa A y 4 de Empresa B), se envían como dos ítems en `items[]` con el mismo `catalogId` y distinto `companyId`.
  - Realiza `upsert` atómico en `QuantityStock` usando la clave única `(catalogId, locationId, companyId)`.

### 2.3. Hardware Serializado (`src/modules/hardware-items/`)
- **Alta Individual (`POST /hardware-items`):**
  - Exige `companyId` (UUID de `Company` activa) y acepta `color` opcional.
  - Sincroniza `+1` en `QuantityStock` para `(catalogId, locationId, companyId)` dentro de la transacción.
- **Consultas y Filtros (`GET /hardware-items`, `GET /hardware-items/scan/:code`, `GET /hardware-items/available-serials`, `GET /hardware-items/:id`):**
  - `GET /hardware-items` incorpora los query params opcionales:
    - `companyId` (UUID): Filtra equipos pertenecientes a esa empresa.
    - `color` (string): Filtro parcial case-insensitive por color.
    - `search` (string): Incluye también coincidencia por `color` además de `serialNumber`, `brand`, `model` y `processor`.
  - Todos los DTOs de respuesta de `HardwareItem` incluyen `color` (`string | null`), `companyId`, `companyName` y `companyRuc`.
- **Actualización, Baja y Segunda Mano:**
  - `PATCH /hardware-items/:id`: Permite actualizar `color` (opcional) además de `salePrice`, `locationId` y `status`.
  - `PATCH /hardware-items/:id/decommission`: Decrementa `-1` en `QuantityStock` usando `(item.catalogId, item.locationId, item.companyId)`.
  - `POST /hardware-items/approve-used`: Acepta `companyId` opcional (si no se envía, hereda el `item.companyId` original) e incrementa `+1` en `QuantityStock` para `(usedCatalogId, locationId, effectiveCompanyId)`.

### 2.4. Stock Cuantitativo y Detalle de Catálogo (`QuantityStock` y `Catalog`)
- **Stock Cuantitativo (`src/modules/quantity-stock/`):**
  - `POST /quantity-stock/inbound`: Exige `companyId` (UUID de `Company` activa) y realiza `upsert` por `(catalogId, locationId, companyId)`.
  - `PATCH /quantity-stock/adjust`: Exige `companyId` (UUID) para identificar exactamente el registro `(catalogId, locationId, companyId)` a ajustar y valida que no existan series activas de esa combinación.
  - `GET /quantity-stock`: Agrega el filtro opcional `companyId` (UUID) e incluye `companyId`, `companyName` y `companyRuc` en cada elemento devuelto.
- **Detalle de Catálogo (`GET /catalog/:id`):**
  - Mantiene intacta la suma consolidada por ubicación (`totalAvailable` suma todas las filas de `QuantityStock` del `catalogId` en esa ubicación) e incorpora `companyBreakdown: Array<{ companyId, companyName, companyRuc, quantity }>` dentro de cada elemento de `stockSummary`.

### 2.5. Compatibilidad con Distribución Directa (`POST /transfers/direct`)
- **Serializados (`hardwareItemIds`):** Al mover cada serie entre `fromLocationId` y `toLocationId`, decrementa `-1` en `QuantityStock` de `(item.catalogId, fromLocationId, item.companyId)` e incrementa `+1` en `(item.catalogId, toLocationId, item.companyId)`.
- **Cuantitativos (`quantities`):** Cada elemento de `quantities` requiere `{ catalogId, companyId, quantity }` (permitiendo enviar el mismo `catalogId` en líneas distintas si pertenecen a diferentes empresas) y persiste `companyId` en `InternalTransferItem`.

---

## 3. Cambios en Base de Datos (`prisma/schema.prisma`)

Manteniendo estrictamente **Prisma v5.22.0**:
1. **Nuevo Modelo `Company` (`companies`):**
   - `id String @id @default(uuid())`
   - `name String @unique`
   - `ruc String @unique`
   - `address String`
   - `active Boolean @default(true)`
   - `createdAt DateTime @default(now())`
   - `updatedAt DateTime @updatedAt`
   - Relaciones: `hardwareItems HardwareItem[]`, `quantityStocks QuantityStock[]`, `transferItems InternalTransferItem[]`.
2. **Modelo `HardwareItem` (`hardware_items`):**
   - Agregar `color String?`
   - Agregar `companyId String` con relación `company Company @relation(fields: [companyId], references: [id])` y `@@index([companyId])`.
3. **Modelo `QuantityStock` (`quantity_stocks`):**
   - Agregar `companyId String` con relación `company Company @relation(fields: [companyId], references: [id])` y `@@index([companyId])`.
   - Reemplazar `@@unique([catalogId, locationId])` por `@@unique([catalogId, locationId, companyId])`.
4. **Modelo `InternalTransferItem` (`internal_transfer_items`):**
   - Agregar `companyId String?` con relación `company Company? @relation(fields: [companyId], references: [id])`.

---

## 4. Criterios de Aceptación
1. Módulo `companies` implementado bajo Arquitectura Hexagonal (`domain`, `application`, `infrastructure`) con validaciones obligatorias de `name`, `ruc` (11 dígitos) y `address`.
2. `POST /inventory/inbound` soporta ingresos divididos por empresa y color en un mismo lote sin duplicar productos en `ProductCatalog`.
3. `GET /hardware-items` filtra correctamente por `companyId` y `color`, y `GET /quantity-stock` filtra por `companyId`, devolviendo los datos de la empresa en sus respuestas.
4. `GET /catalog/:id` consolida el total por ubicación y expone el desglose por empresa (`companyBreakdown`).
5. Traslados (`POST /transfers/direct`), bajas (`decommission`) y aprobaciones de usados (`approve-used`) mantienen sincronizado `QuantityStock` por `(catalogId, locationId, companyId)`.
6. `npx prisma validate`, `npx prisma db push`, `npx prisma generate`, `npm test`, `npm run build` y `@specs/API_CONTRACTS.md` actualizados sin errores.