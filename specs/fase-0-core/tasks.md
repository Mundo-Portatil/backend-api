# Tareas de Implementación — Fase 0: Core, Auth, RBAC, Ubicaciones y Bitácora Global

## Fase 0.1: Preparación del Entorno, Dependencias y Modelo de Datos
- [x] **T0.1.1: Instalación de paquetes requeridos**
  - Dependencias instaladas: `@nestjs/swagger`, `swagger-ui-express`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`.
  - Dependencias de desarrollo instaladas: `@types/passport-jwt`, `@types/bcrypt`.
  - `@prisma/client` y `prisma` permanecen inalterados en `5.22.0`.
- [x] **T0.1.2: Actualización del esquema Prisma (`prisma/schema.prisma`)**
  - Se agregó el campo `password String` en el modelo `User` y `userId String?` en `AuditLog`.
  - Ejecutado `npx prisma db push` sincronizando Supabase exitosamente.
  - Ejecutado `npx prisma generate` con Prisma Client v5.22.0.
- [x] **T0.1.3: Configuración del script de Seed en `package.json`**
  - Añadida configuración `"prisma": { "seed": "ts-node prisma/seed.ts" }` en `package.json`.

---

## Fase 0.2: Shared Kernel (`src/shared/`)
- [x] **T0.2.1: Implementación de `PrismaModule` y `PrismaService`**
  - Creado `src/shared/infrastructure/prisma/prisma.service.ts` extendiendo `PrismaClient` con ciclos de vida `OnModuleInit` (`$connect`) y `OnModuleDestroy` (`$disconnect`) con soporte para `DIRECT_URL`.
  - Creado `src/shared/infrastructure/prisma/prisma.module.ts` decorado con `@Global()` exportando `PrismaService`.
- [x] **T0.2.2: Definición de puertos transversales (`domain/ports/`)**
  - Creado `src/shared/domain/ports/audit-log.port.ts` con interfaz `AuditLogPort`, tipo `AuditLogEntry` y símbolo `AUDIT_LOG_PORT`.
  - Creado `src/shared/domain/ports/transaction-manager.port.ts` con interfaz `TransactionManagerPort` y símbolo `TRANSACTION_MANAGER_PORT`.
  - Creado `src/shared/domain/ports/password-hasher.port.ts` con interfaz `PasswordHasherPort` y símbolo `PASSWORD_HASHER`.
- [x] **T0.2.3: Implementación de adaptadores de Shared Kernel**
  - Creado `src/shared/infrastructure/adapters/prisma-transaction-manager.adapter.ts` implementando `TransactionManagerPort`.
  - Creado `src/shared/infrastructure/security/bcrypt-hasher.adapter.ts` implementando `PasswordHasherPort`.

---

## Fase 0.3: Módulo de Bitácora / Auditoría Global (`src/modules/audit-logs/`)
- [x] **T0.3.1: Capa de Dominio**
  - Creada entidad `src/modules/audit-logs/domain/entities/audit-log.entity.ts`.
  - Creado puerto `src/modules/audit-logs/domain/ports/out/audit-log-repository.port.ts` y símbolo `AUDIT_LOG_REPOSITORY`.
- [x] **T0.3.2: Capa de Aplicación**
  - Creados DTOs puros `create-audit-log.dto.ts` y `query-audit-logs.dto.ts`.
  - Creado caso de uso `record-audit-log.use-case.ts` (con captura segura de errores por `Logger`).
  - Creado caso de uso `get-audit-logs.use-case.ts` (orden descendente por fecha y filtros).
- [x] **T0.3.3: Capa de Infraestructura**
  - Creado mapper `audit-log.mapper.ts`.
  - Creado repositorio `prisma-audit-log.repository.ts`.
  - Creado servicio `audit-log.service.ts` implementando `AuditLogPort` y método `log()`.
  - Creado DTO HTTP Swagger `query-audit-logs.http-dto.ts`.
  - Creado controlador `audit-logs.controller.ts` para `GET /audit-logs` (restringido a `ADMIN`).
- [x] **T0.3.4: Ensamblado en `audit-logs.module.ts`**
  - Configurado como `@Global()`.
  - Enlazados providers para `AUDIT_LOG_PORT` y `AUDIT_LOG_REPOSITORY`.
  - Exportados `AUDIT_LOG_PORT` y `AuditLogService`.

---

## Fase 0.4: Módulo de Autenticación y Seguridad (`src/modules/auth/`)
- [x] **T0.4.1: Capa de Dominio**
  - Creado puerto `token-service.port.ts` y símbolo `TOKEN_SERVICE`.
- [x] **T0.4.2: Capa de Aplicación**
  - Creados DTOs puros `login-command.dto.ts` y `auth-response.dto.ts`.
  - Creado caso de uso `login.use-case.ts` (valida usuario, compara hash, emite log `LOGIN` con IP, retorna JWT).
  - Creado caso de uso `get-profile.use-case.ts`.
- [x] **T0.4.3: Capa de Infraestructura (Adaptadores de Seguridad y HTTP)**
  - Creado adaptador `jwt-token.adapter.ts`.
  - Creada estrategia `jwt.strategy.ts` (Passport JWT con validación de estado activo).
  - Creados guards `jwt-auth.guard.ts` (con bypass para `@Public()`) y `roles.guard.ts`.
  - Creados decoradores `@Public()`, `@Roles(...)` y `@CurrentUser()`.
  - Creado DTO HTTP Swagger `login.http-dto.ts`.
  - Creado controlador `auth.controller.ts` con `POST /auth/login` y `GET /auth/profile`.
- [x] **T0.4.4: Ensamblado en `auth.module.ts`**
  - Importado `UsersModule` para inyección de `USER_REPOSITORY` sin dependencias circulares.
  - Configurado `PassportModule` y `JwtModule.registerAsync` con variables de entorno.
  - Exportados guards, decoradores y `JwtStrategy`.

---

## Fase 0.5: Módulo de Usuarios (`src/modules/users/`)
- [x] **T0.5.1: Capa de Dominio**
  - Creada entidad `user.entity.ts` con lógica pura de sanitización (`sanitize`) e invariantes.
  - Creado puerto `user-repository.port.ts` y exportado símbolo `USER_REPOSITORY`.
- [x] **T0.5.2: Capa de Aplicación**
  - Creados DTOs puros `create-user-command.dto.ts`, `update-user-command.dto.ts` y `user-response.dto.ts`.
  - Creado caso de uso `create-user.use-case.ts` (valida duplicados, hashea password, emite log `CREATE_USER` sin password).
  - Creado caso de uso `get-users.use-case.ts` (orden `createdAt: 'desc'` sin contraseñas).
  - Creado caso de uso `update-user.use-case.ts` (valida existencia, re-hashea si cambia password, emite log `UPDATE_USER`).
- [x] **T0.5.3: Capa de Infraestructura**
  - Creado mapper `user.mapper.ts`.
  - Creado repositorio `prisma-user.repository.ts`.
  - Creados DTOs HTTP Swagger `create-user.http-dto.ts` y `update-user.http-dto.ts`.
  - Creado controlador `users.controller.ts` con `POST /users`, `GET /users`, `PATCH /users/:id` con `new ParseUUIDPipe({ version: '4' })`, protegido por `JwtAuthGuard` y `@Roles(Role.ADMIN)`.
- [x] **T0.5.4: Ensamblado en `users.module.ts`**
  - Proveído `{ provide: USER_REPOSITORY, useClass: PrismaUserRepository }`.
  - Exportado `USER_REPOSITORY` para su consumo en `AuthModule`.

---

## Fase 0.6: Módulo de Ubicaciones (`src/modules/locations/`)
- [x] **T0.6.1: Capa de Dominio**
  - Creada entidad `location.entity.ts`.
  - Creado puerto `location-repository.port.ts` y símbolo `LOCATION_REPOSITORY`.
- [x] **T0.6.2: Capa de Aplicación**
  - Creados DTOs puros `create-location-command.dto.ts`, `update-location-command.dto.ts` y `location-response.dto.ts`.
  - Creado caso de uso `create-location.use-case.ts` (guarda y emite log `CREATE_LOCATION`).
  - Creado caso de uso `get-locations.use-case.ts` (filtro opcional `active`).
  - Creado caso de uso `update-location.use-case.ts` (actualiza name/active y emite log `UPDATE_LOCATION`).
- [x] **T0.6.3: Capa de Infraestructura**
  - Creado mapper `location.mapper.ts`.
  - Creado repositorio `prisma-location.repository.ts`.
  - Creados DTOs HTTP Swagger `create-location.http-dto.ts` y `update-location.http-dto.ts`.
  - Creado controlador `locations.controller.ts` con:
    - `POST /locations` (Solo `ADMIN`).
    - `GET /locations` (`ADMIN`, `VENDEDOR`, `TECNICO`).
    - `PATCH /locations/:id` (Solo `ADMIN` con `ParseUUIDPipe`).
- [x] **T0.6.4: Ensamblado en `locations.module.ts`**
  - Proveído `{ provide: LOCATION_REPOSITORY, useClass: PrismaLocationRepository }`.
  - Exportados casos de uso y puerto.

---

## Fase 0.7: Orquestación Global, Seed y Documentación Swagger
- [x] **T0.7.1: Script de Seed Inicial (`prisma/seed.ts`)**
  - Creado script `prisma/seed.ts` idempotente.
  - Creada ubicación `ALMACEN_CENTRAL`: `"Almacén Central"`.
  - Creada ubicación `PUESTO`: `"Puesto 102 - Mercadillo Bolognesi"`.
  - Creado usuario `ADMIN`: `admin@mundoportatil.pe` con contraseña encriptada de `"Admin123!"`, rol `ADMIN`, `active: true`.
- [x] **T0.7.2: Configuración de `src/app.module.ts`**
  - Configurado `ConfigModule.forRoot({ isGlobal: true })`.
  - Importados `PrismaModule`, `AuditLogsModule`, `AuthModule`, `UsersModule` y `LocationsModule`.
- [x] **T0.7.3: Configuración de `src/main.ts`**
  - Activado CORS (`app.enableCors()`).
  - Configurado `ValidationPipe` global con `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
  - Configurado Swagger en `/api` con título `"Mundo Portátil API"`, versión `"1.0"`, `addBearerAuth()`.

---

## Fase 0.8: Validación, Compilación y Criterios de Aceptación
- [x] **T0.8.1: Ejecución del Seed en la Base de Datos**
  - `npx prisma db seed` ejecutado exitosamente con registros creados en Supabase.
- [x] **T0.8.2: Verificación de Aislamiento y Pureza Hexagonal**
  - Ningún archivo en `domain/` o `application/` importa `@prisma/client`, `@nestjs/swagger` o decoradores HTTP.
- [x] **T0.8.3: Compilación TypeScript**
  - `npm run build` ejecutado exitosamente con **0 errores** de compilación (Exit code 0).
- [x] **T0.8.4: Verificación de Swagger y Rutas**
  - Documentación OpenAPI configurada en `/api` con todos los esquemas DTO y endpoints RBAC.
