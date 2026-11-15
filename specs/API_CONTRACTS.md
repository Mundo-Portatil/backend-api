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

> **Restricción de Acceso:** Todos los endpoints de este módulo requieren token JWT y rol `ADMIN`.

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

### Módulo: Ubicaciones Físicas (`Locations`)

#### 6. Crear Ubicación
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

#### 7. Listar Ubicaciones
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

#### 8. Actualizar Ubicación (Modificación / Soft Delete)
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

#### 9. Consultar Registros de Auditoría
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

## 3. Resumen Rápido de Rutas para Frontend

| Método | Endpoint | Roles Permitidos | Título / Acción en Frontend |
| :---: | :--- | :--- | :--- |
| `POST` | `/auth/login` | `Público` | Formulario de Login |
| `GET` | `/auth/profile` | `ADMIN`, `VENDEDOR`, `TECNICO` | Datos del usuario logueado / Navbar |
| `POST` | `/users` | `ADMIN` | Modal / Formulario de Nuevo Personal |
| `GET` | `/users` | `ADMIN` | Tabla de Administración de Personal |
| `PATCH`| `/users/:id` | `ADMIN` | Editar Rol / Desactivar Usuario |
| `POST` | `/locations` | `ADMIN` | Crear Puesto o Almacén |
| `GET` | `/locations` | `ADMIN`, `VENDEDOR`, `TECNICO` | Selectores de Ubicación / Stock |
| `PATCH`| `/locations/:id` | `ADMIN` | Renombrar o Desactivar Ubicación |
| `GET` | `/audit-logs` | `ADMIN` | Pantalla de Bitácora y Auditoría |

---

> [!NOTE]
> **Actualizado hasta: Fase 0 - Core y Auth**
> Este documento cubre todos los endpoints del núcleo de infraestructura, autenticación JWT, RBAC, ubicaciones y bitácora. Nuevos endpoints para inventario (M1), ventas/POS (M2) y logística (M3) serán incorporados a esta especificación en las fases subsecuentes.
