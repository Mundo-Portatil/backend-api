# Guía Oficial de Contratos de API — Backend "Mundo Portátil"

Este documento constituye el contrato de integración oficial para el equipo de **Frontend** (Web y Móvil). Cualquier comunicación cliente-servidor debe apegarse estrictamente a las especificaciones, rutas, tipos de datos y formatos descritos en esta guía.

---

## 1. Configuración General

### 1.1 Entorno y URL Base
- **Servidor Local (Desarrollo):** `http://localhost:3000`
- **Documentación Swagger / OpenAPI interactiva:** `http://localhost:3000/api`

### 1.2 Formato de Encabezados (Headers)
Excepto en rutas marcadas como **`Público`**, todas las peticiones deben incluir la cabecera estándar de autorización con el token JWT Bearer:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
```

### 1.3 Formato Global de Errores (RFC 7807 / NestJS Standard)
El backend procesa todas las peticiones con un `ValidationPipe` estricto (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`). En caso de error, el payload de respuesta tiene la siguiente estructura:

```json
{
  "message": [
    "El email es obligatorio",
    "La contraseña debe tener al menos 6 caracteres"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

O para errores de negocio / autorización:

```json
{
  "message": "Credenciales inválidas o usuario inactivo",
  "error": "Unauthorized",
  "statusCode": 401
}
```

### 1.4 Enums Globales del Sistema
Valores exactos que el Frontend debe enviar y renderizar:

#### `Role` (Roles de Personal)
| Valor | Descripción |
| :--- | :--- |
| `ADMIN` | Administrador total del sistema (gestión de personal, bitácora, configuración). |
| `VENDEDOR` | Operador del punto de venta (POS, ventas, transferencias). |
| `TECNICO` | Operador de taller y servicio técnico. |

#### `LocationType` (Tipos de Ubicación)
| Valor | Descripción |
| :--- | :--- |
| `ALMACEN_CENTRAL` | Depósito físico central de mercadería. |
| `PUESTO` | Tienda física o punto de venta en galería/mercadillo. |

#### `ItemStatus` (Estados de Hardware Serializado)
| Valor | Descripción |
| :--- | :--- |
| `EN_STOCK` | Disponible para venta, acoplamiento o transferencia. |
| `VENDIDO` | Vendido a cliente final en el POS. |
| `SEGUNDA_MANO_PENDIENTE` | Extraído tras upgrade, pendiente de revisión/aprobación por Admin. |
| `EN_GARANTIA` | Retirado por falla o enviado a garantía técnica. |
| `DE_BAJA` | Decomisionado / dado de baja lógica por error de ingreso o daño irreparable. |

---

## 2. Endpoints por Módulo (Fase 0)

---

### Módulo: Autenticación (`Auth`)

#### 1. Iniciar Sesión (Login)
Autentica un usuario activo mediante correo y contraseña, emitiendo un token de acceso JWT y registrando el evento de auditoría `LOGIN` con la IP del cliente.

- **Método y Ruta:** `POST /auth/login`
- **Roles Permitidos:** `Público` (no requiere token)
- **Parámetros de Ruta:** Ninguno
- **Query Params:** Ninguno
- **Body de Entrada (`application/json`):**
  | Atributo | Tipo | Requerido | Reglas de Validación | Descripción |
  | :--- | :--- | :--- | :--- | :--- |
  | `email` | `string` | **Sí** | Formato de correo válido (`@IsEmail`) | Correo del usuario registrado |
  | `password` | `string` | **Sí** | Mínimo 6 caracteres (`@MinLength(6)`) | Contraseña en texto plano |

  *Ejemplo de Request:*
  ```json
  {
    "email": "admin@mundoportatil.pe",
    "password": "Admin123!"
  }
  ```

- **Respuesta Exitosa:** `200 OK`
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "59673086-e125-4a1c-b549-f243e19e42d4",
      "email": "admin@mundoportatil.pe",
      "name": "Administrador Principal",
      "role": "ADMIN"
    }
  }
  ```

- **Códigos de Error:**
  - `400 Bad Request`: Payload incompleto o email no válido.
  - `401 Unauthorized`: Contraseña incorrecta, email inexistente o usuario inactivo (`active: false`).

---

#### 2. Consultar Perfil en Sesión
Recupera los datos del usuario autenticado a partir del token JWT enviado en el header.

- **Método y Ruta:** `GET /auth/profile`
- **Roles Permitidos:** `ADMIN`, `VENDEDOR`, `TECNICO`
- **Parámetros de Ruta:** Ninguno
- **Query Params:** Ninguno
- **Body de Entrada:** Ninguno

- **Respuesta Exitosa:** `200 OK`
  ```json
  {
    "id": "59673086-e125-4a1c-b549-f243e19e42d4",
    "email": "admin@mundoportatil.pe",
    "name": "Administrador Principal",
    "role": "ADMIN",
    "active": true
  }
  ```

- **Códigos de Error:**
  - `401 Unauthorized`: Token ausente, expirado o adulterado.
  - `404 Not Found`: El usuario ya no existe en la base de datos.

---

### Módulo: Personal y Usuarios (`Users`)

> **Control de Acceso:** Los endpoints de gestión general de usuarios (`POST /users`, `GET /users`, `PATCH /users/:id`) requieren rol `ADMIN`. El endpoint de actualización de perfil propio (`PATCH /users/me`) está habilitado para todos los colaboradores autenticados (`ADMIN`, `VENDEDOR`, `TECNICO`).

#### 3. Crear Usuario
Crea un nuevo usuario en el sistema, encripta su contraseña de forma segura y registra `CREATE_USER` en la bitácora inalterable.

- **Método y Ruta:** `POST /users`
- **Roles Permitidos:** `ADMIN`
- **Parámetros de Ruta:** Ninguno
- **Query Params:** Ninguno
- **Body de Entrada (`application/json`):**
  | Atributo | Tipo | Requerido | Reglas de Validación | Descripción |
  | :--- | :--- | :--- | :--- | :--- |
  | `email` | `string` | **Sí** | Formato de correo válido | Correo único corporativo |
  | `name` | `string` | **Sí** | Texto no vacío | Nombre completo del colaborador |
  | `password` | `string` | **Sí** | Mínimo 6 caracteres | Contraseña inicial de acceso |
  | `role` | `string` (Enum) | No | `ADMIN`, `VENDEDOR`, `TECNICO` (default: `VENDEDOR`) | Rol operativo asignado |

  *Ejemplo de Request:*
  ```json
  {
    "email": "carlos.vendedor@mundoportatil.pe",
    "name": "Carlos Mendoza",
    "password": "Password123!",
    "role": "VENDEDOR"
  }
  ```

- **Respuesta Exitosa:** `201 Created`
  *(Nótese que la contraseña jamás es retornada)*
  ```json
  {
    "id": "e7b2c9d0-1234-4a5b-8c9d-0123456789ab",
    "email": "carlos.vendedor@mundoportatil.pe",
    "name": "Carlos Mendoza",
    "role": "VENDEDOR",
    "active": true,
    "createdAt": "2026-11-14T20:30:00.000Z",
    "updatedAt": "2026-11-14T20:30:00.000Z"
  }
  ```

- **Códigos de Error:**
  - `400 Bad Request`: Atributos faltantes o formato de email/rol no válido.
  - `401 Unauthorized`: Token ausente o inválido.
  - `403 Forbidden`: Usuario autenticado no posee rol `ADMIN`.
  - `409 Conflict`: El correo electrónico ya se encuentra registrado.

---

#### 4. Listar Usuarios
Obtiene la lista de todos los usuarios registrados, ordenados por fecha de creación descendente (`createdAt: desc`).

- **Método y Ruta:** `GET /users`
- **Roles Permitidos:** `ADMIN`
- **Parámetros de Ruta:** Ninguno
- **Query Params:** Ninguno
- **Body de Entrada:** Ninguno

- **Respuesta Exitosa:** `200 OK`
  ```json
  [
    {
      "id": "e7b2c9d0-1234-4a5b-8c9d-0123456789ab",
      "email": "carlos.vendedor@mundoportatil.pe",
      "name": "Carlos Mendoza",
      "role": "VENDEDOR",
      "active": true,
      "createdAt": "2026-11-14T20:30:00.000Z",
      "updatedAt": "2026-11-14T20:30:00.000Z"
    },
    {
      "id": "59673086-e125-4a1c-b549-f243e19e42d4",
      "email": "admin@mundoportatil.pe",
      "name": "Administrador Principal",
      "role": "ADMIN",
      "active": true,
      "createdAt": "2026-11-14T20:00:00.000Z",
      "updatedAt": "2026-11-14T20:00:00.000Z"
    }
  ]
  ```

- **Códigos de Error:**
  - `401 Unauthorized`: Token inválido o ausente.
  - `403 Forbidden`: No autorizado (requiere `ADMIN`).

---

#### 5. Actualizar Usuario (Modificación / Soft Delete)
Permite modificar de forma parcial los datos de un usuario existente, cambiar su rol, re-establecer contraseña o deshabilitarlo (`active: false`).

- **Método y Ruta:** `PATCH /users/:id`
- **Roles Permitidos:** `ADMIN`
- **Parámetros de Ruta:**
  | Parámetro | Tipo | Requerido | Validación | Descripción |
  | :--- | :--- | :--- | :--- | :--- |
  | `id` | `string` | **Sí** | UUIDv4 obligatorio (`ParseUUIDPipe`) | ID único del usuario |
- **Query Params:** Ninguno
- **Body de Entrada (`application/json`):**
  *(Todos los campos son opcionales; solo se envían los que se desean modificar)*
  | Atributo | Tipo | Requerido | Reglas de Validación | Descripción |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | `string` | No | Texto | Nuevo nombre del usuario |
  | `role` | `string` (Enum) | No | `ADMIN`, `VENDEDOR`, `TECNICO` | Nuevo rol asignado |
  | `active` | `boolean` | No | `true` o `false` | `false` para desactivar acceso |
  | `password` | `string` | No | Mínimo 6 caracteres | Nueva contraseña (será re-hasheada) |

  *Ejemplo de Request (Desactivar usuario y ascender de rol):*
  ```json
  {
    "role": "TECNICO",
    "active": false
  }
  ```

- **Respuesta Exitosa:** `200 OK`
  ```json
  {
    "id": "e7b2c9d0-1234-4a5b-8c9d-0123456789ab",
    "email": "carlos.vendedor@mundoportatil.pe",
    "name": "Carlos Mendoza",
    "role": "TECNICO",
    "active": false,
    "createdAt": "2026-11-14T20:30:00.000Z",
    "updatedAt": "2026-11-14T20:45:00.000Z"
  }
  ```

- **Códigos de Error:**
  - `400 Bad Request`: Formato de UUID incorrecto en `:id` o tipo de dato inválido en el body.
  - `401 Unauthorized`: Token no proporcionado.
  - `403 Forbidden`: Acceso denegado (requiere `ADMIN`).
  - `404 Not Found`: No existe usuario con el `:id` especificado.

---

#### 6. Actualizar Perfil Propio (Nombres, Correo y Contraseña)
Permite a cualquier usuario autenticado (incluyendo roles que no son administradores: `VENDEDOR`, `TECNICO`, y también `ADMIN`) actualizar sus datos personales: correo electrónico, nombres y/o contraseña. El usuario se identifica automáticamente mediante su token JWT de sesión. Si se actualiza el correo, el sistema valida que no esté en uso por otra cuenta; si se actualiza la contraseña, se cifra con bcrypt. Emite el evento `UPDATE_PROFILE` en la bitácora inalterable.

- **Método y Ruta:** `PATCH /users/me`
- **Roles Permitidos:** `ADMIN`, `VENDEDOR`, `TECNICO` (todos los usuarios autenticados)
- **Parámetros de Ruta:** Ninguno (el usuario se identifica por su Bearer token)
- **Query Params:** Ninguno
- **Body de Entrada (`application/json`):**
  *(Todos los campos son opcionales; solo se envían los que se desean modificar)*
  | Atributo | Tipo | Requerido | Reglas de Validación | Descripción |
  | :--- | :--- | :--- | :--- | :--- |
  | `email` | `string` | No | Formato de correo válido (`@IsEmail`) | Nuevo correo electrónico corporativo/personal |
  | `name` | `string` | No | Texto no vacío (`@IsString`) | Nombres y apellidos actualizados |
  | `password` | `string` | No | Mínimo 6 caracteres (`@MinLength(6)`) | Nueva contraseña de acceso (será cifrada) |

  *Ejemplo de Request:*
  ```json
  {
    "email": "carlos.mendoza.nuevo@mundoportatil.pe",
    "name": "Carlos Mendoza Ramos",
    "password": "NuevaPasswordSegura123!"
  }
  ```

- **Respuesta Exitosa:** `200 OK`
  *(La contraseña nunca es expuesta en la respuesta)*
  ```json
  {
    "id": "e7b2c9d0-1234-4a5b-8c9d-0123456789ab",
    "email": "carlos.mendoza.nuevo@mundoportatil.pe",
    "name": "Carlos Mendoza Ramos",
    "role": "VENDEDOR",
    "active": true,
    "createdAt": "2026-11-14T20:30:00.000Z",
    "updatedAt": "2026-11-18T23:50:00.000Z"
  }
  ```

- **Códigos de Error:**
  - `400 Bad Request`: Formato de correo inválido o contraseña con menos de 6 caracteres.
  - `401 Unauthorized`: Token ausente, vencido o inválido.
  - `404 Not Found`: Usuario no encontrado en la base de datos.
  - `409 Conflict`: El nuevo correo electrónico ya está registrado por otro usuario.

---

### Módulo: Ubicaciones Físicas (`Locations`)

#### 7. Crear Ubicación
Crea un almacén central o puesto de venta y registra `CREATE_LOCATION` en bitácora.

- **Método y Ruta:** `POST /locations`
- **Roles Permitidos:** `ADMIN`
- **Parámetros de Ruta:** Ninguno
- **Query Params:** Ninguno
- **Body de Entrada (`application/json`):**
  | Atributo | Tipo | Requerido | Reglas de Validación | Descripción |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | `string` | **Sí** | Texto no vacío | Nombre descriptivo del almacén o puesto |
  | `type` | `string` (Enum) | No | `ALMACEN_CENTRAL`, `PUESTO` (default: `PUESTO`) | Tipo de locación física |

  *Ejemplo de Request:*
  ```json
  {
    "name": "Puesto 105 - Galería Tacna Centro",
    "type": "PUESTO"
  }
  ```

- **Respuesta Exitosa:** `201 Created`
  ```json
  {
    "id": "18cf3994-3a21-4f12-9c1a-28952a1290bb",
    "name": "Puesto 105 - Galería Tacna Centro",
    "type": "PUESTO",
    "active": true,
    "createdAt": "2026-11-14T20:50:00.000Z"
  }
  ```

- **Códigos de Error:**
  - `400 Bad Request`: Nombre vacío o tipo de ubicación no válido.
  - `401 Unauthorized`: Token ausente o vencido.
  - `403 Forbidden`: Solo accesible por administradores.

---

#### 8. Listar Ubicaciones
Retorna todas las ubicaciones registradas, con soporte para filtrar únicamente ubicaciones operativas/activas.

- **Método y Ruta:** `GET /locations`
- **Roles Permitidos:** `ADMIN`, `VENDEDOR`, `TECNICO`
- **Parámetros de Ruta:** Ninguno
- **Query Params:**
  | Parámetro | Tipo | Requerido | Descripción |
  | :--- | :--- | :--- | :--- |
  | `active` | `boolean` | No | Si se envía `?active=true`, retorna solo activas. Si se omite, retorna todas. |

  *Ejemplo de Petición:*
  `GET /locations?active=true`

- **Respuesta Exitosa:** `200 OK`
  ```json
  [
    {
      "id": "ed85bb8e-25e9-42d5-af3d-4b3f5d42e0b7",
      "name": "Almacén Central",
      "type": "ALMACEN_CENTRAL",
      "active": true,
      "createdAt": "2026-11-14T20:00:00.000Z"
    },
    {
      "id": "44b6b4ff-0f4d-48ee-b119-8ae66e48e32e",
      "name": "Puesto 102 - Mercadillo Bolognesi",
      "type": "PUESTO",
      "active": true,
      "createdAt": "2026-11-14T20:00:00.000Z"
    }
  ]
  ```

- **Códigos de Error:**
  - `400 Bad Request`: Si el query parameter `active` no es un booleano convertible.
  - `401 Unauthorized`: Token no válido o ausente.

---

#### 9. Actualizar Ubicación (Modificación / Soft Delete)
Permite renombrar una ubicación o desactivarla lógicamente mediante `active: false`.

- **Método y Ruta:** `PATCH /locations/:id`
- **Roles Permitidos:** `ADMIN`
- **Parámetros de Ruta:**
  | Parámetro | Tipo | Requerido | Validación | Descripción |
  | :--- | :--- | :--- | :--- | :--- |
  | `id` | `string` | **Sí** | UUIDv4 obligatorio (`ParseUUIDPipe`) | ID único de la ubicación |
- **Query Params:** Ninguno
- **Body de Entrada (`application/json`):**
  | Atributo | Tipo | Requerido | Reglas de Validación | Descripción |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | `string` | No | Texto | Nuevo nombre de la ubicación |
  | `active` | `boolean` | No | `true` o `false` | Desactivar / reactivar ubicación |

  *Ejemplo de Request (Soft Delete):*
  ```json
  {
    "active": false
  }
  ```

- **Respuesta Exitosa:** `200 OK`
  ```json
  {
    "id": "44b6b4ff-0f4d-48ee-b119-8ae66e48e32e",
    "name": "Puesto 102 - Mercadillo Bolognesi",
    "type": "PUESTO",
    "active": false,
    "createdAt": "2026-11-14T20:00:00.000Z"
  }
  ```

- **Códigos de Error:**
  - `400 Bad Request`: Formato de UUID incorrecto.
  - `401 Unauthorized`: Token no proporcionado.
  - `403 Forbidden`: Requiere rol `ADMIN`.
  - `404 Not Found`: Ubicación no encontrada.

---

### Módulo: Bitácora Inalterable (`Audit Logs` - M6)

#### 10. Consultar Registros de Auditoría
Consulta paginada y filtrable de todos los eventos del sistema (login, creaciones, modificaciones), ordenados por fecha descendente.

- **Método y Ruta:** `GET /audit-logs`
- **Roles Permitidos:** `ADMIN`
- **Parámetros de Ruta:** Ninguno
- **Query Params:**
  | Parámetro | Tipo | Requerido | Default | Descripción |
  | :--- | :--- | :--- | :--- | :--- |
  | `module` | `string` | No | — | Filtrar por módulo (`auth`, `users`, `locations`, etc.) |
  | `userId` | `string` (UUIDv4) | No | — | Filtrar por el ID del usuario autor |
  | `page` | `integer` | No | `1` | Número de página (mínimo 1) |
  | `limit` | `integer` | No | `20` | Cantidad de registros por página (máx. 100) |

  *Ejemplo de Petición:*
  `GET /audit-logs?module=users&page=1&limit=10`

- **Respuesta Exitosa:** `200 OK`
  ```json
  {
    "items": [
      {
        "id": "78a9c0d1-b2c3-4d5e-8f90-123456789abc",
        "userId": "59673086-e125-4a1c-b549-f243e19e42d4",
        "action": "CREATE_USER",
        "module": "users",
        "payload": {
          "id": "e7b2c9d0-1234-4a5b-8c9d-0123456789ab",
          "email": "carlos.vendedor@mundoportatil.pe",
          "name": "Carlos Mendoza",
          "role": "VENDEDOR",
          "active": true
        },
        "ipAddress": "127.0.0.1",
        "createdAt": "2026-11-14T20:30:00.000Z"
      },
      {
        "id": "67f8b9a0-c1d2-3e4f-7a89-0123456789de",
        "userId": "59673086-e125-4a1c-b549-f243e19e42d4",
        "action": "LOGIN",
        "module": "auth",
        "payload": {
          "email": "admin@mundoportatil.pe",
          "role": "ADMIN"
        },
        "ipAddress": "190.235.12.44",
        "createdAt": "2026-11-14T20:25:00.000Z"
      }
    ],
    "total": 2,
    "page": 1,
    "limit": 10
  }
  ```

- **Códigos de Error:**
  - `400 Bad Request`: Si `userId` no es un UUID válido o `page`/`limit` no son enteros positivos.
  - `401 Unauthorized`: Token no válido o ausente.
  - `403 Forbidden`: Solo accesible para `ADMIN`.

---

## 3. Endpoints por Módulo (Fase 1: Inventario)

---

### Módulo: Categorías Dinámicas (`Categories`)

#### 1. Crear Categoría
- **Ruta:** `POST /categories`
- **Roles Permitidos:** `ADMIN`
- **Descripción:** Registra una nueva categoría de productos (Laptops, RAM, SSD, etc.) con validación de nombre único case-insensitive. Emite `CREATE_CATEGORY` en bitácora.
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "name": "LAPTOP",
    "description": "Equipos portátiles para trabajo y gaming",
    "active": true
  }
  ```
- **Respuesta Exitosa (`201 Created`):**
  ```json
  {
    "id": "77e45678-e89b-12d3-a456-426614174000",
    "name": "LAPTOP",
    "description": "Equipos portátiles para trabajo y gaming",
    "active": true,
    "createdAt": "2026-11-14T21:00:00.000Z"
  }
  ```
- **Códigos de Error:**
  - `400 Bad Request`: Nombre vacío o tipos incorrectos.
  - `409 Conflict`: Ya existe una categoría con ese nombre.

#### 2. Listar Categorías con Conteo de Productos
- **Ruta:** `GET /categories`
- **Roles Permitidos:** `ADMIN`, `VENDEDOR`, `TECNICO`
- **Parámetros de Consulta (Query Params):**
  - `active` *(opcional, boolean)*: Filtrar por `true` o `false`.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  [
    {
      "id": "77e45678-e89b-12d3-a456-426614174000",
      "name": "LAPTOP",
      "description": "Equipos portátiles para trabajo y gaming",
      "active": true,
      "productsCount": 14,
      "createdAt": "2026-11-14T21:00:00.000Z"
    },
    {
      "id": "88e45678-e89b-12d3-a456-426614174001",
      "name": "RAM",
      "description": "Memorias RAM DDR4 y DDR5",
      "active": true,
      "productsCount": 8,
      "createdAt": "2026-11-14T21:05:00.000Z"
    }
  ]
  ```

#### 3. Actualizar Categoría o Estado Activo (Soft Delete)
- **Ruta:** `PATCH /categories/:id`
- **Roles Permitidos:** `ADMIN`
- **Parámetros de Ruta:** `:id` (UUIDv4)
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "name": "LAPTOP GAMING",
    "description": "Portátiles gaming y estaciones de trabajo",
    "active": true
  }
  ```
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "id": "77e45678-e89b-12d3-a456-426614174000",
    "name": "LAPTOP GAMING",
    "description": "Portátiles gaming y estaciones de trabajo",
    "active": true,
    "createdAt": "2026-11-14T21:00:00.000Z"
  }
  ```
- **Códigos de Error:**
  - `404 Not Found`: Si la categoría no existe.
  - `409 Conflict`: Si el nuevo nombre colisiona con otra categoría activa.

---

### Módulo: Catálogo Maestro de Productos (`Catalog`)

#### 1. Registrar Producto Maestro
- **Ruta:** `POST /catalog`
- **Roles Permitidos:** `ADMIN`
- **Descripción:** Ficha técnica maestra de producto. Valida que `categoryId` exista y esté activa, y que el `sku` sea único. Emite `CREATE_CATALOG_ITEM` en bitácora.
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "sku": "NB-ACER-A515-56-001",
    "name": "Acer Aspire 5 15.6\" i5",
    "brand": "Acer",
    "model": "A515-56",
    "categoryId": "77e45678-e89b-12d3-a456-426614174000",
    "processor": "Intel Core i5-1135G7",
    "ramCapacity": "16GB DDR4",
    "storageCapacity": "512GB NVMe SSD",
    "gpu": "Intel Iris Xe",
    "screenSize": "15.6\" FHD IPS",
    "isSerialized": true,
    "minStockThreshold": 2,
    "basePrice": 2350.00,
    "isSecondHand": false,
    "active": true
  }
  ```
- **Respuesta Exitosa (`201 Created`):**
  ```json
  {
    "id": "99e45678-e89b-12d3-a456-426614174002",
    "sku": "NB-ACER-A515-56-001",
    "name": "Acer Aspire 5 15.6\" i5",
    "brand": "Acer",
    "model": "A515-56",
    "categoryId": "77e45678-e89b-12d3-a456-426614174000",
    "processor": "Intel Core i5-1135G7",
    "ramCapacity": "16GB DDR4",
    "storageCapacity": "512GB NVMe SSD",
    "gpu": "Intel Iris Xe",
    "screenSize": "15.6\" FHD IPS",
    "isSerialized": true,
    "minStockThreshold": 2,
    "basePrice": 2350,
    "isSecondHand": false,
    "active": true,
    "createdAt": "2026-11-14T21:10:00.000Z"
  }
  ```
- **Códigos de Error:**
  - `400 Bad Request`: Categoría inexistente o inactiva.
  - `409 Conflict`: SKU duplicado.

#### 2. Listar Catálogo con Filtros y Paginación
- **Ruta:** `GET /catalog`
- **Roles Permitidos:** `ADMIN`, `VENDEDOR`, `TECNICO`
- **Parámetros de Consulta (Query Params):**
  - `categoryId` *(opcional, UUID)*
  - `active` *(opcional, boolean)*
  - `search` *(opcional, string)*: Coincidencia en SKU, nombre, marca o modelo.
  - `page` *(opcional, default: 1)*
  - `limit` *(opcional, default: 50)*
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "items": [
      {
        "id": "99e45678-e89b-12d3-a456-426614174002",
        "sku": "NB-ACER-A515-56-001",
        "name": "Acer Aspire 5 15.6\" i5",
        "brand": "Acer",
        "model": "A515-56",
        "categoryId": "77e45678-e89b-12d3-a456-426614174000",
        "processor": "Intel Core i5-1135G7",
        "ramCapacity": "16GB DDR4",
        "storageCapacity": "512GB NVMe SSD",
        "gpu": "Intel Iris Xe",
        "screenSize": "15.6\" FHD IPS",
        "isSerialized": true,
        "minStockThreshold": 2,
        "basePrice": 2350,
        "isSecondHand": false,
        "active": true,
        "createdAt": "2026-11-14T21:10:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 50
  }
  ```

#### 3. Detalle de Producto Maestro con Desglose de Stock por Ubicación
- **Ruta:** `GET /catalog/:id`
- **Roles Permitidos:** `ADMIN`, `VENDEDOR`, `TECNICO`
- **Descripción:** Retorna la ficha técnica y calcula en tiempo real las existencias disponibles desglosadas por `Almacén Central` y cada `Puesto`.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "item": {
      "id": "99e45678-e89b-12d3-a456-426614174002",
      "sku": "NB-ACER-A515-56-001",
      "name": "Acer Aspire 5 15.6\" i5",
      "brand": "Acer",
      "model": "A515-56",
      "categoryId": "77e45678-e89b-12d3-a456-426614174000",
      "basePrice": 2350,
      "isSerialized": true,
      "active": true
    },
    "categoryName": "LAPTOP",
    "stockSummary": [
      {
        "locationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "locationName": "Almacén Central",
        "locationType": "ALMACEN_CENTRAL",
        "serializedCount": 5,
        "quantityCount": 0,
        "totalAvailable": 5
      },
      {
        "locationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
        "locationName": "Puesto 102 - Mercadillo Bolognesi",
        "locationType": "PUESTO",
        "serializedCount": 2,
        "quantityCount": 0,
        "totalAvailable": 2
      }
    ],
    "totalStockOverall": 7
  }
  ```

#### 4. Actualizar Producto Maestro
- **Ruta:** `PATCH /catalog/:id`
- **Roles Permitidos:** `ADMIN`
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "basePrice": 2400.00,
    "minStockThreshold": 3,
    "active": true
  }
  ```
- **Respuesta Exitosa (`200 OK`):** Producto actualizado con datos reflejados.

---

### Módulo: Inventario Serializado y Lotes (`HardwareItems`)

#### 1. Ingreso Masivo por Lotes (Batch Inbound)
- **Ruta:** `POST /hardware-items/batch-inbound`
- **Roles Permitidos:** `ADMIN`
- **Descripción:** Alta atómica transaccional de múltiples laptops con sus componentes internos acoplados (RAM, SSD, batería, cargador) e ítems sueltos. Si no se envía `serialNumber`, el backend genera automáticamente un código interno `MP-YYYYMMDD-XXXXXX`. Emite `BATCH_INBOUND_HARDWARE` en bitácora.
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "locationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "items": [
      {
        "catalogId": "99e45678-e89b-12d3-a456-426614174002",
        "serialNumber": "SN-ACER-99881",
        "costPrice": 2000.00,
        "salePrice": 2400.00,
        "children": [
          {
            "catalogId": "88e45678-e89b-12d3-a456-426614174001",
            "serialNumber": "SN-RAM-8GB-01",
            "costPrice": 100.00,
            "salePrice": 150.00
          },
          {
            "catalogId": "77e45678-e89b-12d3-a456-426614174003",
            "costPrice": 80.00,
            "salePrice": 120.00
          }
        ]
      }
    ]
  }
  ```
- **Respuesta Exitosa (`201 Created`):**
  ```json
  [
    {
      "id": "11111111-2222-3333-4444-555555555555",
      "serialNumber": "SN-ACER-99881",
      "catalogId": "99e45678-e89b-12d3-a456-426614174002",
      "locationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "status": "EN_STOCK",
      "parentChassisId": null,
      "costPrice": 2000,
      "salePrice": 2400,
      "components": [
        {
          "id": "22222222-3333-4444-5555-666666666666",
          "serialNumber": "SN-RAM-8GB-01",
          "catalogId": "88e45678-e89b-12d3-a456-426614174001",
          "locationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "status": "EN_STOCK",
          "parentChassisId": "11111111-2222-3333-4444-555555555555"
        },
        {
          "id": "33333333-4444-5555-6666-777777777777",
          "serialNumber": "MP-20261114-A1B2C3",
          "catalogId": "77e45678-e89b-12d3-a456-426614174003",
          "locationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "status": "EN_STOCK",
          "parentChassisId": "11111111-2222-3333-4444-555555555555"
        }
      ]
    }
  ]
  ```

#### 2. Validar Números de Serie en Vivo
- **Ruta:** `POST /hardware-items/validate-serials`
- **Roles Permitidos:** `ADMIN`
- **Descripción:** Endpoint ultra-rápido para el formulario del Administrador; recibe un lote de números de serie y responde cuáles ya existen en la BD.
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "serialNumbers": ["SN-ACER-99881", "SN-NUEVO-001"]
  }
  ```
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "existingSerials": ["SN-ACER-99881"],
    "allValid": false
  }
  ```

#### 3. Impresión Masiva de Etiquetas Térmicas 1D
- **Ruta:** `POST /hardware-items/barcode-labels/batch`
- **Roles Permitidos:** `ADMIN`, `VENDEDOR`, `TECNICO`
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "hardwareItemIds": [
      "11111111-2222-3333-4444-555555555555",
      "22222222-3333-4444-5555-666666666666"
    ]
  }
  ```
- **Respuesta Exitosa (`200 OK`):**
  ```json
  [
    {
      "hardwareItemId": "11111111-2222-3333-4444-555555555555",
      "barcodeValue": "SN-ACER-99881",
      "title": "Acer A515-56",
      "specsSummary": "Intel Core i5-1135G7 | 16GB DDR4 | 512GB NVMe SSD | Intel Iris Xe",
      "locationName": "Almacén Central",
      "price": 2400
    }
  ]
  ```

#### 4. Aprobar Componente de Segunda Mano
- **Ruta:** `POST /hardware-items/approve-used`
- **Roles Permitidos:** `ADMIN`
- **Descripción:** Incorpora formalmente al inventario un componente extraído (en estado `SEGUNDA_MANO_PENDIENTE`), pasándolo a `EN_STOCK`, asignando `locationId`, precio de venta `salePrice`, y vinculándolo automáticamente a un catálogo de segunda mano (crea la variante `-USED` si no existía).
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "itemId": "22222222-3333-4444-5555-666666666666",
    "locationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "salePrice": 95.00
  }
  ```
- **Respuesta Exitosa (`200 OK`):** Hardware ítem con `status: "EN_STOCK"`, precio actualizado y catálogo usado vinculado.

#### 5. Alta Individual de Hardware
- **Ruta:** `POST /hardware-items`
- **Roles Permitidos:** `ADMIN`
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "catalogId": "99e45678-e89b-12d3-a456-426614174002",
    "locationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "serialNumber": "SN-OPTIONAL-001",
    "costPrice": 1900.00,
    "salePrice": 2350.00
  }
  ```

#### 6. Scanner-First: Búsqueda Rápida por Serie o Código de Barras
- **Ruta:** `GET /hardware-items/scan/:code`
- **Roles Permitidos:** `ADMIN`, `VENDEDOR`, `TECNICO`
- **Descripción:** Busca por `serialNumber` o código interno Code 128. Retorna el hardware, su ubicación actual, y si es laptop devuelve sus componentes hijos; si es una pieza dentro de una laptop, devuelve su equipo padre.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "id": "11111111-2222-3333-4444-555555555555",
    "serialNumber": "SN-ACER-99881",
    "catalogId": "99e45678-e89b-12d3-a456-426614174002",
    "locationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "status": "EN_STOCK",
    "parentChassisId": null,
    "components": [
      {
        "id": "22222222-3333-4444-5555-666666666666",
        "serialNumber": "SN-RAM-8GB-01",
        "status": "EN_STOCK"
      }
    ],
    "parentChassis": null
  }
  ```

#### 7. Listar Hardware Serializado con Filtros
- **Ruta:** `GET /hardware-items`
- **Roles Permitidos:** `ADMIN`, `VENDEDOR`, `TECNICO`
- **Parámetros de Consulta (Query Params):**
  - `locationId` *(opcional, UUID)*
  - `categoryId` *(opcional, UUID)*
  - `catalogItemId` *(opcional, UUID)*
  - `status` *(opcional, Enum: `EN_STOCK`, `VENDIDO`, `SEGUNDA_MANO_PENDIENTE`, `EN_GARANTIA`, `DE_BAJA`)*
  - `condition` *(opcional: `nuevo` o `usado`)*
  - `onlyParents` *(opcional, boolean)*: `true` devuelve solo chasis principales con componentes anidados.
  - `search` *(opcional, string)*: Búsqueda por N/S o modelo.
  - `page` *(opcional, default: 1)*
  - `limit` *(opcional, default: 50)*

#### 8. Hoja de Vida de Hardware (M6)
- **Ruta:** `GET /hardware-items/:id/lifecycle`
- **Roles Permitidos:** `ADMIN`, `VENDEDOR`, `TECNICO`
- **Descripción:** Línea de tiempo completa de todos los eventos de auditoría y movimientos asociados al ítem.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "hardwareItemId": "11111111-2222-3333-4444-555555555555",
    "serialNumber": "SN-ACER-99881",
    "events": [
      {
        "id": "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
        "action": "ATTACH_HARDWARE_CHILD",
        "module": "hardware-items",
        "timestamp": "2026-11-14T21:30:00.000Z",
        "userName": "Administrador Principal",
        "payload": {
          "parentId": "11111111-2222-3333-4444-555555555555",
          "childIds": ["22222222-3333-4444-5555-666666666666"]
        }
      },
      {
        "id": "b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e",
        "action": "BATCH_INBOUND_HARDWARE",
        "module": "hardware-items",
        "timestamp": "2026-11-14T21:15:00.000Z",
        "userName": "Administrador Principal",
        "payload": {
          "locationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
        }
      }
    ]
  }
  ```

#### 9. Obtener Etiqueta Térmica 1D Individual
- **Ruta:** `GET /hardware-items/:id/barcode-label`
- **Roles Permitidos:** `ADMIN`, `VENDEDOR`, `TECNICO`
- **Descripción:** Devuelve los datos formateados para impresión térmica de etiqueta 1D Code 128 y registra `PRINT_BARCODE_LABEL`.

#### 10. Actualizar Precios/Ubicación/Estado
- **Ruta:** `PATCH /hardware-items/:id`
- **Roles Permitidos:** `ADMIN`
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "salePrice": 2450.00,
    "locationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "status": "EN_STOCK"
  }
  ```

#### 11. Dar de Baja Lógica (Decommission)
- **Ruta:** `PATCH /hardware-items/:id/decommission`
- **Roles Permitidos:** `ADMIN`
- **Descripción:** Cambia el estado a `DE_BAJA` con motivo obligatorio `reason`. Valida que el ítem no haya sido vendido previamente.
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "reason": "Cortocircuito irreversible en placa detectado en banco de pruebas"
  }
  ```

#### 12. Acoplar Componentes Hijos a Equipo Chasis Padre
- **Ruta:** `POST /hardware-items/:id/children`
- **Roles Permitidos:** `ADMIN`
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "childIds": ["22222222-3333-4444-5555-666666666666"]
  }
  ```
- **Validaciones de Dominio:**
  - El hijo no puede ser el mismo padre.
  - Sin ciclos en la jerarquía.
  - Padre e hijo deben encontrarse en la misma ubicación física (`locationId`).
  - Ambos deben estar disponibles en estado `EN_STOCK`.

#### 13. Desacoplar Componente Hijo
- **Ruta:** `DELETE /hardware-items/:id/children/:childId`
- **Roles Permitidos:** `ADMIN`
- **Descripción:** Libera `parentChassisId = null` dejando el componente disponible en la misma ubicación del padre.

---

### Módulo: Inventario por Cantidad (`QuantityStock`)

#### 1. Entrada de Mercadería por Cantidad
- **Ruta:** `POST /quantity-stock/inbound`
- **Roles Permitidos:** `ADMIN`
- **Descripción:** Registra o incrementa el stock no serializado (accesorios, periféricos, fuentes) para una ubicación. Realiza `upsert` atómico y actualiza precios de reposición si se especifican. Emite `INBOUND_QUANTITY_STOCK`.
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "catalogId": "55e45678-e89b-12d3-a456-426614174005",
    "locationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "quantity": 25,
    "costPrice": 12.50,
    "salePrice": 25.00
  }
  ```
- **Respuesta Exitosa (`201 Created`):**
  ```json
  {
    "id": "66e45678-e89b-12d3-a456-426614174006",
    "catalogId": "55e45678-e89b-12d3-a456-426614174005",
    "catalogName": "Mouse Inalámbrico Logitech M170",
    "catalogSku": "LOG-M170-GR",
    "locationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "locationName": "Puesto 102 - Mercadillo Bolognesi",
    "quantity": 25,
    "costPrice": 12.5,
    "salePrice": 25,
    "minStockThreshold": 5,
    "isLowStock": false,
    "updatedAt": "2026-11-14T21:40:00.000Z"
  }
  ```

#### 2. Ajuste Manual de Inventario (Conteo Físico o Merma)
- **Ruta:** `PATCH /quantity-stock/adjust`
- **Roles Permitidos:** `ADMIN`
- **Descripción:** Ajusta la cantidad física total a un valor absoluto con `reason` obligatorio. Calcula el delta y emite `ADJUST_QUANTITY_STOCK` en bitácora.
- **Cuerpo de la Petición (`application/json`):**
  ```json
  {
    "catalogId": "55e45678-e89b-12d3-a456-426614174005",
    "locationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "newQuantity": 23,
    "reason": "Auditoría de cierre quincenal - 2 unidades rotas por caída en mostrador"
  }
  ```
- **Respuesta Exitosa (`200 OK`):** Stock ajustado con nuevo saldo reflejado.

#### 3. Listar Stock Cuantitativo y Alertas de Stock Bajo
- **Ruta:** `GET /quantity-stock`
- **Roles Permitidos:** `ADMIN`, `VENDEDOR`, `TECNICO`
- **Parámetros de Consulta (Query Params):**
  - `locationId` *(opcional, UUID)*
  - `categoryId` *(opcional, UUID)*
  - `catalogItemId` *(opcional, UUID)*
  - `lowStock` *(opcional, boolean)*: `true` filtra solo aquellos productos cuya cantidad es menor o igual al umbral `minStockThreshold` del catálogo.
  - `page` *(opcional, default: 1)*
  - `limit` *(opcional, default: 50)*
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "items": [
      {
        "id": "66e45678-e89b-12d3-a456-426614174006",
        "catalogId": "55e45678-e89b-12d3-a456-426614174005",
        "catalogName": "Mouse Inalámbrico Logitech M170",
        "catalogSku": "LOG-M170-GR",
        "locationId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
        "locationName": "Puesto 102 - Mercadillo Bolognesi",
        "quantity": 2,
        "costPrice": 12.5,
        "salePrice": 25,
        "minStockThreshold": 5,
        "isLowStock": true,
        "updatedAt": "2026-11-14T21:40:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 50
  }
  ```

---

## 4. Resumen Rápido de Rutas para Frontend

| Método | Endpoint | Roles Permitidos | Título / Acción en Frontend |
| :---: | :--- | :--- | :--- |
| **Auth & Core** | | | |
| `POST` | `/auth/login` | `Público` | Formulario de Login |
| `GET` | `/auth/profile` | `ADMIN`, `VENDEDOR`, `TECNICO` | Datos del usuario logueado / Navbar |
| `POST` | `/users` | `ADMIN` | Modal / Formulario de Nuevo Personal |
| `GET` | `/users` | `ADMIN` | Tabla de Administración de Personal |
| `PATCH`| `/users/me` | `ADMIN`, `VENDEDOR`, `TECNICO` | **Mi Perfil**: Actualizar datos propios (nombre, correo, clave) |
| `PATCH`| `/users/:id` | `ADMIN` | Editar Rol / Desactivar Usuario |
| `POST` | `/locations` | `ADMIN` | Crear Puesto o Almacén |
| `GET` | `/locations` | `ADMIN`, `VENDEDOR`, `TECNICO` | Selectores de Ubicación / Stock |
| `PATCH`| `/locations/:id` | `ADMIN` | Renombrar o Desactivar Ubicación |
| `GET` | `/audit-logs` | `ADMIN` | Pantalla de Bitácora y Auditoría Global |
| **Fase 1: Categorías** | | | |
| `POST` | `/categories` | `ADMIN` | Modal Crear Nueva Categoría |
| `GET` | `/categories` | `ADMIN`, `VENDEDOR`, `TECNICO` | Selectores de Categoría y Lista de Filtros |
| `PATCH`| `/categories/:id` | `ADMIN` | Editar o Desactivar Categoría |
| **Fase 1: Catálogo** | | | |
| `POST` | `/catalog` | `ADMIN` | Formulario Alta de Producto Maestro |
| `GET` | `/catalog` | `ADMIN`, `VENDEDOR`, `TECNICO` | Vista Catálogo Maestro con Búsqueda y Paginación |
| `GET` | `/catalog/:id` | `ADMIN`, `VENDEDOR`, `TECNICO` | Ficha Técnica con Desglose de Stock por Puesto/Almacén |
| `PATCH`| `/catalog/:id` | `ADMIN` | Edición de Ficha Técnica, Precios y Soft Delete |
| **Fase 1: Hardware Items** | | | |
| `POST` | `/hardware-items/batch-inbound` | `ADMIN` | Formulario Ingreso Masivo por Lotes (Laptops + Hijos) |
| `POST` | `/hardware-items/validate-serials` | `ADMIN` | Validación en vivo al pistolear series en lote |
| `POST` | `/hardware-items/barcode-labels/batch` | `ADMIN`, `VENDEDOR`, `TECNICO` | Cola de Impresión Térmica de Etiquetas 1D |
| `POST` | `/hardware-items/approve-used` | `ADMIN` | Aprobación de Piezas Usadas (Segunda Mano) a Stock |
| `POST` | `/hardware-items` | `ADMIN` | Alta individual de equipo o pieza serializada |
| `GET` | `/hardware-items/scan/:code` | `ADMIN`, `VENDEDOR`, `TECNICO` | **Scanner-First**: Detección rápida de N/S, ubicación y padre/hijos |
| `GET` | `/hardware-items` | `ADMIN`, `VENDEDOR`, `TECNICO` | Tabla de Inventario Físico Serializado |
| `GET` | `/hardware-items/:id` | `ADMIN`, `VENDEDOR`, `TECNICO` | Detalle del Hardware con relación Chasis/Componentes |
| `GET` | `/hardware-items/:id/lifecycle` | `ADMIN`, `VENDEDOR`, `TECNICO` | **Hoja de Vida (M6)**: Timeline de auditoría y movimientos |
| `GET` | `/hardware-items/:id/barcode-label` | `ADMIN`, `VENDEDOR`, `TECNICO` | Impresión térmica de etiqueta 1D Code 128 |
| `PATCH`| `/hardware-items/:id` | `ADMIN` | Modificar precio de venta, ubicación o estado |
| `PATCH`| `/hardware-items/:id/decommission` | `ADMIN` | Dar de baja lógica un ítem con motivo |
| `POST` | `/hardware-items/:id/children` | `ADMIN` | Acoplar componentes hijos (upgrade en taller/tienda) |
| `DELETE`| `/hardware-items/:id/children/:childId` | `ADMIN` | Desacoplar componente hijo |
| **Fase 1: Stock Cuantitativo** | | | |
| `POST` | `/quantity-stock/inbound` | `ADMIN` | Entrada de existencias físicas no serializadas |
| `PATCH`| `/quantity-stock/adjust` | `ADMIN` | Ajuste manual por inventario físico o merma |
| `GET` | `/quantity-stock` | `ADMIN`, `VENDEDOR`, `TECNICO` | Tabla de existencias no serializadas y alertas de stock bajo |

---

> [!NOTE]
> **Actualizado hasta: Fase 1 - Categorías, Catálogo Maestro, Lotes, Inventario (Serializado/Cantidad) y Trazabilidad**
> Este documento cubre exhaustivamente todos los contratos del Core (Fase 0) e Inventario (Fase 1). Nuevos endpoints para Ventas/POS y Facturación (Fase 2) y Servicio Técnico/Taller (Fase 3) serán incorporados en las fases subsecuentes.
