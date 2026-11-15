# Especificación Fase 0: Core, Auth, RBAC, Ubicaciones y Bitácora

## Objetivo
Construir la base transversal del sistema `backend-api` (conexión a BD, autenticación JWT, control de roles, ubicaciones físicas y bitácora global) sobre la cual dependerán los módulos de negocio.

## Requerimientos Técnicos por Módulo

### 1. Configuración Global (`src/main.ts` y `src/app.module.ts`)
- Habilitar CORS (`app.enableCors()`).
- Configurar `ValidationPipe` global (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`).
- Configurar Swagger en `/api` con título `"Mundo Portátil API"`, versión `"1.0"` y esquema `BearerAuth`.

### 2. PrismaModule (`src/prisma`)
- Módulo `@Global()` que exporta `PrismaService` extendiendo `PrismaClient` con `OnModuleInit` (`$connect`) y `OnModuleDestroy` (`$disconnect`).

### 3. AuditLogsModule (`src/audit-logs`) — Bitácora Global (M6)
- Módulo `@Global()` que exporta `AuditLogService`.
- Método `log(data: { userId?: string; action: string; module: string; payload?: any; ipAddress?: string })` que inserta un registro en `audit_logs`. Debe capturar errores internos con `Logger` para que un fallo de log no tumbe la aplicación si no es transaccional, o aceptar un cliente transaccional opcional `tx`.
- **Endpoint:**
  - `GET /audit-logs` (Solo `ADMIN`): Lista registros de bitácora ordenados por fecha descendente (`createdAt: 'desc'`), con filtros opcionales por query (`module`, `userId`, `page`, `limit`).

### 4. AuthModule (`src/auth`)
- **Verificación de Schema:** Revisar el modelo `User` en `prisma/schema.prisma`. Si no tiene el campo `password String`, agregarlo y ejecutar `npx prisma db push` y `npx prisma generate` (manteniendo Prisma v5).
- Autenticación con `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` y encriptación de contraseñas con `bcrypt`.
- **Guards y Decoradores exportables (`src/auth/guards` y `src/auth/decorators`):**
  - `JwtAuthGuard`: Valida el token JWT Bearer y adjunta el usuario activo a `request.user`.
  - `@Roles(...roles: Role[])`: Decorador `SetMetadata` para restringir acceso por rol.
  - `RolesGuard`: Verifica que `request.user.role` esté incluido en `@Roles(...)`.
  - `@CurrentUser()`: Decorador de parámetro (`createParamDecorator`) que devuelve `request.user`.
- **Endpoints:**
  - `POST /auth/login` (Público): Recibe `{ email, password }`. Verifica que el usuario exista, esté activo (`active: true`) y la contraseña coincida con `bcrypt.compare`. Registra el evento `LOGIN` en `AuditLogService` (incluyendo IP) y retorna `{ access_token, user: { id, email, name, role } }`.
  - `GET /auth/profile` (Autenticado): Retorna los datos del usuario actual (`id`, `email`, `name`, `role`, `active`).

### 5. UsersModule (`src/users`) — Gestión de Personal (M5)
- Acceso restringido exclusivamente a `ADMIN`.
- **Endpoints:**
  - `POST /users`: Crea un usuario (`email`, `name`, `password`, `role`), encripta `password` con `bcrypt` (10 rounds), registra `CREATE_USER` en bitácora y devuelve el usuario sin `password`.
  - `GET /users`: Lista todos los usuarios ordenados por `createdAt` descendente (excluyendo `password`).
  - `PATCH /users/:id`: Valida `id` con `ParseUUIDPipe`. Permite actualizar `name`, `role`, `active` (y `password` opcionalmente re-encriptándolo). Registra `UPDATE_USER` en bitácora.

### 6. LocationsModule (`src/locations`) — Almacén Central y Puestos
- **Endpoints:**
  - `POST /locations` (Solo `ADMIN`): Crea una ubicación (`name`, `type`: `ALMACEN_CENTRAL` o `PUESTO`) y registra `CREATE_LOCATION` en bitácora.
  - `GET /locations` (`ADMIN`, `VENDEDOR`, `TECNICO`): Lista todas las ubicaciones (con filtro opcional `?active=true`).
  - `PATCH /locations/:id` (Solo `ADMIN`): Valida `id` con `ParseUUIDPipe`. Permite editar `name` o `active` y registra `UPDATE_LOCATION` en bitácora.

### 7. Seed Inicial (`prisma/seed.ts`)
- Configurar `"prisma": { "seed": "ts-node prisma/seed.ts" }` en `package.json`.
- Script idempotente (`upsert`) que cree si no existen:
  1. Ubicación `ALMACEN_CENTRAL`: `"Almacén Central"`.
  2. Ubicación `PUESTO`: `"Puesto 102 - Mercadillo Bolognesi"`.
  3. Usuario `ADMIN`: `email: "admin@mundoportatil.pe"`, `name: "Administrador Principal"`, `password: "Admin123!"` (hasheada con bcrypt), `role: "ADMIN"`, `active: true`.