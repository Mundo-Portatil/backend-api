# Plan Técnico — Fase 0: Core, Auth, RBAC, Ubicaciones y Bitácora Global

## 1. Visión General y Alineación Arquitectural
Este plan define la implementación técnica de la **Fase 0** del backend de **Mundo Portátil**, siguiendo estrictamente la **Constitución Técnica** (`specs/CONSTITUTION.md`), la especificación de fase (`specs/fase_0_core/spec.md`) y el modelo de datos en Prisma (`prisma/schema.prisma`).

### Principios de la Arquitectura Monolito Modular Hexagonal
1. **Regla de Dependencia Estricta:**
   $$\text{Infrastructure (Adaptadores)} \longrightarrow \text{Application (Casos de Uso)} \longrightarrow \text{Domain (Entidades y Puertos)}$$
   - Las capas `domain/` y `application/` son completamente **puras**: queda terminantemente prohibido importar `@prisma/client`, `@nestjs/swagger` o decoradores HTTP en ellas.
2. **Inversión de Dependencias (Puertos y Adaptadores):**
   - Los Casos de Uso dependen exclusivamente de contratos/interfaces (`Ports`) ubicados en `domain/ports/out/`.
   - La inyección en NestJS se realiza mediante `Symbols` (`@Inject(PORT_TOKEN)`).
   - Los adaptadores concretos (`Prisma*Repository`, `BcryptHasherAdapter`, `JwtTokenAdapter`) residen en `infrastructure/adapters/`.
3. **Aislamiento Modular y Núcleo Compartido:**
   - Cada módulo de negocio reside en `src/modules/<nombre-modulo>/`.
   - El núcleo transversal reside en `src/shared/`: alberga `PrismaService`, el puerto transversal `AuditLogPort` (M6) y `TransactionManagerPort` (Unit of Work).
   - Ningún módulo accede a la persistencia interna de otro módulo.

---

## 2. Pila Tecnológica y Dependencias

### Versiones Mandatorias (Sin Excepciones)
- **Node.js / TypeScript:** TypeScript estricto con `strict: true` y `strictNullChecks: true`.
- **Prisma:** `@prisma/client@5.22.0` y `prisma@5.22.0`. **PROHIBIDO** actualizar a Prisma v6, v7 o v8.
- **Framework:** NestJS v12.

### Paquetes a Instalar
Para satisfacer Swagger, autenticación JWT, hashing bcrypt y validación:
```bash
# Dependencias de producción
npm install @nestjs/swagger swagger-ui-express @nestjs/passport passport passport-jwt bcrypt

# Dependencias de desarrollo
npm install --save-dev @types/passport-jwt @types/bcrypt
```

---

## 3. Actualización de Base de Datos (`prisma/schema.prisma`)

### Modificación Requerida en `model User`
El modelo actual de `User` carece del campo `password`. Siguiendo el requerimiento de la Fase 0, se actualizará:

```prisma
model User {
  id                   String                     @id @default(uuid())
  email                String                     @unique
  name                 String
  password             String                     // Campo obligatorio para autenticación local
  role                 Role                       @default(VENDEDOR)
  active               Boolean                    @default(true)
  createdAt            DateTime                   @default(now())
  updatedAt            DateTime                   @updatedAt

  cashClosings         CashClosing[]
  transfersSent        TransferRequest[]          @relation("TransferSender")
  transfersRecv        TransferRequest[]          @relation("TransferReceiver")
  auditLogs            AuditLog[]
  ordersTech           TechnicalServiceOrder[]
  passThroughRequested PassThroughApprovalQueue[] @relation("PassThroughRequester")
  passThroughReviewed  PassThroughApprovalQueue[] @relation("PassThroughReviewer")

  @@map("users")
}
```

### Comandos de Sincronización
```bash
npx prisma db push
npx prisma generate
```

---

## 4. Árbol Exacto de Archivos y Carpetas

A continuación se detalla la topología completa que se creará en `src/`:

```
src/
├── app.controller.spec.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
├── main.ts
│
├── shared/                                     # SHARED KERNEL TRANSVERSAL
│   ├── domain/
│   │   └── ports/
│   │       ├── audit-log.port.ts               # Puerto transversal M6 (AUDIT_LOG_PORT)
│   │       └── transaction-manager.port.ts     # Puerto Unit of Work (TRANSACTION_MANAGER_PORT)
│   └── infrastructure/
│       ├── adapters/
│       │   └── prisma-transaction-manager.adapter.ts
│       └── prisma/
│           ├── prisma.module.ts                # Módulo @Global()
│           └── prisma.service.ts               # OnModuleInit ($connect), OnModuleDestroy ($disconnect)
│
├── modules/
│   ├── audit-logs/                             # M6: BITÁCORA GLOBAL
│   │   ├── audit-logs.module.ts                # Módulo @Global() exporta AuditLogService y AUDIT_LOG_PORT
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── audit-log.entity.ts         # Entidad de dominio pura AuditLog
│   │   │   └── ports/
│   │   │       └── out/
│   │   │           └── audit-log-repository.port.ts
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── create-audit-log.dto.ts     # DTO puro de comando de log
│   │   │   │   └── query-audit-logs.dto.ts      # DTO puro de paginación/filtros
│   │   │   └── use-cases/
│   │   │       ├── record-audit-log.use-case.ts # Manejo con Logger interno seguro ante fallos
│   │   │       └── get-audit-logs.use-case.ts  # Consulta paginada filtrada (ADMIN)
│   │   └── infrastructure/
│   │       ├── adapters/
│   │       │   ├── in/
│   │       │   │   └── http/
│   │       │   │       ├── audit-logs.controller.ts # GET /audit-logs
│   │       │   │       └── dto/
│   │       │   │           └── query-audit-logs.http-dto.ts # Decoradores Swagger (@ApiQuery, etc.)
│   │       │   └── out/
│   │       │       └── persistence/
│   │       │           ├── audit-log.mapper.ts
│   │       │           └── prisma-audit-log.repository.ts
│   │       └── services/
│   │           └── audit-log.service.ts        # Fachada amigable para inyección global
│   │
│   ├── auth/                                   # AUTENTICACIÓN Y SEGURIDAD JWT
│   │   ├── auth.module.ts
│   │   ├── domain/
│   │   │   └── ports/
│   │   │       └── out/
│   │   │           ├── password-hasher.port.ts # PASSWORD_HASHER_PORT
│   │   │           └── token-service.port.ts   # TOKEN_SERVICE_PORT
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── login-command.dto.ts        # { email, password, ipAddress }
│   │   │   │   └── auth-response.dto.ts        # { access_token, user }
│   │   │   └── use-cases/
│   │   │       ├── login.use-case.ts           # Verifica user, hash, registra LOGIN y genera JWT
│   │   │       └── get-profile.use-case.ts     # Devuelve perfil activo sanitizado
│   │   └── infrastructure/
│   │       └── adapters/
│   │           ├── in/
│   │           │   └── http/
│   │           │       ├── auth.controller.ts  # POST /auth/login, GET /auth/profile
│   │           │       ├── decorators/
│   │           │       │   ├── current-user.decorator.ts # Extrae request.user
│   │           │       │   ├── public.decorator.ts       # Marca rutas exentas de JWT
│   │           │       │   └── roles.decorator.ts        # Restringe por Role (ADMIN, VENDEDOR, TECNICO)
│   │           │       ├── dto/
│   │           │       │   └── login.http-dto.ts         # Swagger @ApiProperty
│   │           │       ├── guards/
│   │           │       │   ├── jwt-auth.guard.ts         # Valida Bearer JWT
│   │           │       │   └── roles.guard.ts            # Valida Role metadata
│   │           │       └── strategies/
│   │           │           └── jwt.strategy.ts           # Passport JWT Strategy
│   │           └── out/
│   │               └── security/
│   │                   ├── bcrypt-hasher.adapter.ts      # Implementa PasswordHasherPort
│   │                   └── jwt-token.adapter.ts          # Implementa TokenServicePort
│   │
│   ├── users/                                  # M5: GESTIÓN DE PERSONAL (SOLO ADMIN)
│   │   ├── users.module.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts              # Entidad pura con lógica de sanitización e invariantes
│   │   │   └── ports/
│   │   │       └── out/
│   │   │           └── user-repository.port.ts # USER_REPOSITORY_PORT
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── create-user-command.dto.ts
│   │   │   │   └── update-user-command.dto.ts
│   │   │   │   └── user-response.dto.ts
│   │   │   └── use-cases/
│   │   │       ├── create-user.use-case.ts     # Hashea pass, guarda, emite CREATE_USER audit
│   │   │       ├── get-users.use-case.ts       # Lista orden createdAt: 'desc', sin password
│   │   │       └── update-user.use-case.ts     # Modifica name/role/active/password, emite UPDATE_USER audit
│   │   └── infrastructure/
│   │       └── adapters/
│   │           ├── in/
│   │           │   └── http/
│   │           │       ├── users.controller.ts # POST /users, GET /users, PATCH /users/:id
│   │           │       └── dto/
│   │           │           ├── create-user.http-dto.ts # Swagger @ApiProperty
│   │           │           └── update-user.http-dto.ts # Swagger @ApiProperty
│   │           └── out/
│   │               └── persistence/
│   │                   ├── prisma-user.repository.ts
│   │                   └── user.mapper.ts
│   │
│   └── locations/                              # M5: ALMACÉN CENTRAL Y PUESTOS FÍSICOS
│       ├── locations.module.ts
│       ├── domain/
│       │   ├── entities/
│       │   │   └── location.entity.ts          # Entidad pura Location
│       │   └── ports/
│       │       └── out/
│       │           └── location-repository.port.ts # LOCATION_REPOSITORY_PORT
│       ├── application/
│       │   ├── dto/
│       │   │   ├── create-location-command.dto.ts
│       │   │   ├── update-location-command.dto.ts
│       │   │   └── location-response.dto.ts
│       │   └── use-cases/
│       │       ├── create-location.use-case.ts # Emite CREATE_LOCATION audit
│       │       ├── get-locations.use-case.ts   # Filtro opcional ?active=true
│       │       └── update-location.use-case.ts # Valida UUID, modifica, emite UPDATE_LOCATION audit
│       └── infrastructure/
│           └── adapters/
│               ├── in/
│               │   └── http/
│               │       ├── locations.controller.ts # POST /locations, GET /locations, PATCH /locations/:id
│               │       └── dto/
│               │           ├── create-location.http-dto.ts # Swagger @ApiProperty
│               │           └── update-location.http-dto.ts # Swagger @ApiProperty
│               └── out/
│                   └── persistence/
│                       ├── location.mapper.ts
│                       └── prisma-location.repository.ts
```

---

## 5. Diseño Detallado por Módulo

### 5.1 Shared Kernel (`src/shared/`)
- **`PrismaService`:**
  - Extiende `PrismaClient` con interfaces `OnModuleInit` y `OnModuleDestroy`.
  - Configurado en `PrismaModule` con decorador `@Global()`.
- **`AuditLogPort`:**
  - Definido en `src/shared/domain/ports/audit-log.port.ts`.
  - Método `record(entry: AuditLogEntry): Promise<void>`.
  - Token de inyección: `export const AUDIT_LOG_PORT = Symbol('AUDIT_LOG_PORT');`.
- **`TransactionManagerPort`:**
  - Definido en `src/shared/domain/ports/transaction-manager.port.ts`.
  - Permite ejecutar operaciones atómicas Unit of Work sin acoplar los casos de uso a `PrismaClient`.

### 5.2 Módulo de Auditoría (`src/modules/audit-logs/`)
- **Dominio:**
  - Entidad `AuditLogEntity`: atributos `id`, `userId`, `action`, `module`, `payload`, `ipAddress`, `createdAt`.
  - Puerto `AuditLogRepositoryPort` (`AUDIT_LOG_REPOSITORY_PORT`).
- **Aplicación:**
  - `RecordAuditLogUseCase`: Orquesta la inserción. Envuelto en bloque `try / catch` con `Logger` de NestJS para garantizar que una eventual indisponibilidad de la bitácora no descarrile transacciones críticas no dependientes.
  - `GetAuditLogsUseCase`: Permite filtrar por `module`, `userId`, paginación (`page`, `limit`), ordenando por `createdAt: 'desc'`.
- **Infraestructura:**
  - `PrismaAuditLogRepository`: Implementa persistencia y `AuditLogPort`.
  - `AuditLogService`: Fachada conveniente que expone el método `log(...)` requerido por la especificación.
  - `AuditLogsController`: Endpoint `GET /audit-logs` protegido con `JwtAuthGuard` y `@Roles(Role.ADMIN)`.

### 5.3 Módulo de Autenticación (`src/modules/auth/`)
- **Dominio:**
  - Puerto `PasswordHasherPort` (`PASSWORD_HASHER_PORT`): `hash(password: string): Promise<string>`, `compare(plain: string, hash: string): Promise<boolean>`.
  - Puerto `TokenServicePort` (`TOKEN_SERVICE_PORT`): `generateToken(payload: JwtPayload): string`, `verifyToken(token: string): JwtPayload`.
- **Aplicación:**
  - `LoginUseCase`: Recibe `LoginCommandDto` (`email`, `password`, `ipAddress`).
    1. Busca usuario activo por email mediante `UserRepositoryPort`. Si no existe o `active === false`, lanza `UnauthorizedException`.
    2. Compara hash con `PasswordHasherPort`. Si es inválido, lanza `UnauthorizedException`.
    3. Emite evento `LOGIN` a través de `AuditLogPort` con IP y datos sanitizados.
    4. Genera JWT con `id`, `email`, `role`, `name`.
    5. Retorna `{ access_token, user: { id, email, name, role } }`.
  - `GetProfileUseCase`: Retorna los datos del usuario en sesión (`id`, `email`, `name`, `role`, `active`).
- **Infraestructura:**
  - `BcryptHasherAdapter`: Encripta con 10 rondas de salt usando `bcrypt`.
  - `JwtTokenAdapter`: Utiliza `@nestjs/jwt`.
  - `JwtStrategy`: Valida el Bearer Token contra el secreto de entorno `JWT_SECRET`.
  - `JwtAuthGuard`: Guard global o local que verifica autenticación y valida exenciones `@Public()`.
  - `RolesGuard`: Verifica que `user.role` esté presente en la lista requerida por `@Roles(...)`.
  - `AuthController`:
    - `POST /auth/login` (`@Public()`): Login con Swagger docs.
    - `GET /auth/profile`: Retorna perfil del usuario logueado usando `@CurrentUser()`.

### 5.4 Módulo de Usuarios (`src/modules/users/`)
- **Dominio:**
  - Entidad `UserEntity`: Contiene reglas de negocio (ej. validación de roles, verificación de estado activo, sanitización para eliminar `password` en salidas).
  - Puerto `UserRepositoryPort` (`USER_REPOSITORY_PORT`):
    - `create(user: UserEntity): Promise<UserEntity>`
    - `findByEmail(email: string): Promise<UserEntity | null>`
    - `findById(id: string): Promise<UserEntity | null>`
    - `findAll(): Promise<UserEntity[]>`
    - `update(id: string, data: Partial<UserEntity>): Promise<UserEntity>`
- **Aplicación:**
  - `CreateUserUseCase`:
    - Valida que el email no esté registrado (lanza `ConflictException`).
    - Encripta la contraseña usando `PasswordHasherPort`.
    - Guarda usuario con `UserRepositoryPort`.
    - Emite `CREATE_USER` en `AuditLogPort` (excluyendo el password del payload).
    - Retorna el usuario sanitizado.
  - `GetUsersUseCase`: Obtiene todos los usuarios ordenados por `createdAt: 'desc'` sin contraseñas.
  - `UpdateUserUseCase`:
    - Valida existencia previa del usuario.
    - Si se envía `password`, se re-encripta con `PasswordHasherPort`.
    - Aplica cambios parciales (`name`, `role`, `active`, etc.).
    - Emite `UPDATE_USER` en `AuditLogPort`.
    - Retorna el usuario sanitizado.
- **Infraestructura:**
  - `PrismaUserRepository`: Implementa `UserRepositoryPort` interactuando con `PrismaService`.
  - `UserMapper`: Convierte entre modelos Prisma y `UserEntity`.
  - `UsersController`:
    - Protegido totalmente por `JwtAuthGuard` y `@Roles(Role.ADMIN)`.
    - Valida `:id` con `new ParseUUIDPipe({ version: '4' })`.
    - `POST /users`, `GET /users`, `PATCH /users/:id`.

### 5.5 Módulo de Ubicaciones (`src/modules/locations/`)
- **Dominio:**
  - Entidad `LocationEntity`: Atributos `id`, `name`, `type` (`ALMACEN_CENTRAL` | `PUESTO`), `active`, `createdAt`.
  - Puerto `LocationRepositoryPort` (`LOCATION_REPOSITORY_PORT`):
    - `create(location: LocationEntity): Promise<LocationEntity>`
    - `findById(id: string): Promise<LocationEntity | null>`
    - `findAll(filter?: { active?: boolean }): Promise<LocationEntity[]>`
    - `update(id: string, data: Partial<LocationEntity>): Promise<LocationEntity>`
- **Aplicación:**
  - `CreateLocationUseCase`: Persiste la ubicación y emite `CREATE_LOCATION` a bitácora.
  - `GetLocationsUseCase`: Lista ubicaciones con filtro opcional de `active`.
  - `UpdateLocationUseCase`: Actualiza nombre o estado activo (soft delete) y emite `UPDATE_LOCATION` a bitácora.
- **Infraestructura:**
  - `PrismaLocationRepository`: Implementa `LocationRepositoryPort`.
  - `LocationMapper`: Mapeo bidireccional dominio $\leftrightarrow$ persistencia.
  - `LocationsController`:
    - `POST /locations`: Solo `ADMIN`. Emite evento de bitácora.
    - `GET /locations`: Permitido para `ADMIN`, `VENDEDOR` y `TECNICO`. Soporta query `?active=true`.
    - `PATCH /locations/:id`: Solo `ADMIN`. Valida `:id` con `new ParseUUIDPipe({ version: '4' })`.

---

## 6. Configuración Global y Swagger (`src/main.ts` y `src/app.module.ts`)

### `main.ts`
- **CORS:** `app.enableCors()`.
- **ValidationPipe:**
  ```typescript
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  ```
- **Documentación OpenAPI (Swagger):**
  - Ruta de acceso: `/api`.
  - Título: `"Mundo Portátil API"`.
  - Versión: `"1.0"`.
  - Esquema de seguridad: `addBearerAuth()`.

### `app.module.ts`
- Importa `ConfigModule.forRoot({ isGlobal: true })`.
- Importa `PrismaModule` (Shared Kernel global).
- Importa `AuditLogsModule` (Global).
- Importa `AuthModule`, `UsersModule`, `LocationsModule`.

---

## 7. Seed Inicial Idempotente (`prisma/seed.ts`)

### Configuración en `package.json`
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

### Contenido del Script
1. **Ubicación Almacén Central:**
   - Upsert con `name: "Almacén Central"`, `type: LocationType.ALMACEN_CENTRAL`, `active: true`.
2. **Ubicación Puesto:**
   - Upsert con `name: "Puesto 102 - Mercadillo Bolognesi"`, `type: LocationType.PUESTO`, `active: true`.
3. **Usuario Administrador:**
   - Email: `admin@mundoportatil.pe`.
   - Name: `"Administrador Principal"`.
   - Password: Hash generado con `bcrypt.hash("Admin123!", 10)`.
   - Role: `Role.ADMIN`.
   - Active: `true`.
   - Upsert utilizando `email` como clave única.

---

## 8. Matriz de Endpoints y Control de Acceso (RBAC)

| Módulo | Método | Endpoint | Roles Permitidos | Bitácora (M6) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/login` | Público | `LOGIN` | Autentica usuario y emite JWT |
| **Auth** | `GET` | `/auth/profile` | Autenticado (`ADMIN`, `VENDEDOR`, `TECNICO`) | — | Devuelve perfil del token |
| **Users** | `POST` | `/users` | `ADMIN` | `CREATE_USER` | Registra nuevo usuario |
| **Users** | `GET` | `/users` | `ADMIN` | — | Lista usuarios (sin pass) |
| **Users** | `PATCH` | `/users/:id` | `ADMIN` | `UPDATE_USER` | Actualiza datos/rol/estado |
| **Locations**| `POST` | `/locations` | `ADMIN` | `CREATE_LOCATION`| Crea almacén o puesto |
| **Locations**| `GET` | `/locations` | `ADMIN`, `VENDEDOR`, `TECNICO` | — | Lista puestos/almacenes |
| **Locations**| `PATCH` | `/locations/:id` | `ADMIN` | `UPDATE_LOCATION`| Actualiza o desactiva puesto |
| **Audit** | `GET` | `/audit-logs` | `ADMIN` | — | Consulta bitácora inalterable |

---

## 9. Criterios de Aceptación y Validación
1. **Separación de Capas:**
   - Ningún archivo en `domain/` o `application/` importa `@prisma/client`, `@nestjs/swagger` ni decoradores HTTP.
2. **Compilación Limpia:**
   - `npm run build` ejecuta sin advertencias ni errores de TypeScript.
3. **Persistencia e Idempotencia:**
   - `npx prisma db seed` ejecuta exitosamente y puede correr múltiples veces sin duplicar registros.
4. **Documentación Swagger:**
   - Servidor levanta y expone todos los endpoints con sus esquemas DTO y BearerAuth en `http://localhost:3000/api`.
