# Constitución Técnica — Backend "Mundo Portátil"

## 1. Stack y Versiones Obligatorias
- **Framework:** NestJS con TypeScript estricto (`strictNullChecks` compatible).
- **ORM:** Prisma v5 (`@prisma/client@5.22.0` y `prisma@5.22.0`). **PROHIBIDO** actualizar a Prisma v6, v7 o v8. Ejecutar comandos siempre con `npx prisma ...` respetando la versión instalada en `package.json`.
- **Base de datos:** PostgreSQL en Supabase. La fuente única de verdad es `prisma/schema.prisma`.
- **Documentación API:** Swagger (`@nestjs/swagger`) configurado en `/api` con autenticación Bearer JWT (`addBearerAuth()`).

## 2. Arquitectura: Monolito Modular Hexagonal (Puertos y Adaptadores)
El sistema es un **Monolito Modular** donde cada módulo de negocio (`auth`, `users`, `locations`, `audit-logs`, `inventory`, `sales`, `cash`, `shalom`, etc.) implementa internamente **Arquitectura Hexagonal**.

### Regla de Dependencia (Estricta)
`Infrastructure (Adaptadores)` $\rightarrow$ `Application (Casos de Uso)` $\rightarrow$ `Domain (Entidades y Puertos)`
- **El Dominio y la Aplicación son puros:** **PROHIBIDO** importar `@prisma/client`, `@nestjs/swagger` o decoradores HTTP dentro de `domain/` o `application/`.
- **Inversión de Dependencias:** Los casos de uso dependen únicamente de interfaces (`Ports`) definidas en `domain/ports/` e inyectadas mediante Tokens/Symbols de NestJS (`@Inject(PORT_TOKEN)`).

### Estructura Obligatoria por Módulo (`src/modules/<nombre-modulo>/`)
1. `domain/`
   - `entities/`: Entidades de dominio puras y reglas/invariantes de negocio.
   - `ports/out/`: Interfaces de salida (ej. `UserRepositoryPort`, `PasswordHasherPort`, `TokenGeneratorPort`) y sus símbolos de inyección (`export const USER_REPOSITORY = Symbol('USER_REPOSITORY')`).
2. `application/`
   - `use-cases/` (o `services/`): Orquestación de cada caso de uso del módulo (ej. `LoginUseCase`, `CreateUserUseCase`). Reciben comandos/DTOs y operan contra los puertos de salida.
   - `dto/`: Objetos de entrada/salida de aplicación y validación (`class-validator`).
3. `infrastructure/`
   - `adapters/in/http/`: Controladores NestJS (`*.controller.ts`), decoradores Swagger, Guards (`JwtAuthGuard`, `RolesGuard`) y `@CurrentUser()`. Solo traducen HTTP $\leftrightarrow$ Casos de Uso.
   - `adapters/out/persistence/`: Implementaciones concretas con Prisma (`PrismaUserRepository`) y Mappers (`UserMapper.toDomain()` / `toPersistence()`).
   - `adapters/out/<otros>/`: Implementaciones de servicios externos (ej. `BcryptHasherAdapter`, `JwtTokenAdapter`).
4. `<modulo>.module.ts`: Conecta los `Ports` con sus `Adapters` mediante providers de NestJS (`{ provide: TOKEN, useClass: Adapter }`) y exporta únicamente los **Casos de Uso** o **Puertos** públicos que otros módulos necesiten.

### Núcleo Compartido (`src/shared/`) y Comunicación entre Módulos
- **Shared Kernel (`src/shared/`):** Contiene `PrismaService`, el puerto transversal `AuditLogPort` (M6) y un puerto `TransactionManagerPort` (Unit of Work) para ejecutar transacciones atómicas multi-tabla sin filtrar `PrismaClient` hacia la capa de aplicación.
- **Aislamiento Modular:** Un módulo **nunca** debe importar el repositorio Prisma de otro módulo. Si `Sales` necesita descontar inventario, debe invocar el Caso de Uso o Puerto exportado por `Inventory`. Evitar dependencias circulares (`forwardRef`).

## 3. Reglas Transversales de Negocio y Seguridad
- **Identificadores:** Todos los IDs son `UUIDv4`. Validar parámetros `:id` en los controladores con `ParseUUIDPipe`.
- **Validación Global:** Configurar `ValidationPipe` en `main.ts` con `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- **Control de Acceso (RBAC):** Roles únicos: `ADMIN`, `VENDEDOR`, `TECNICO`. Todas las rutas (excepto `POST /auth/login`) protegidas por `JwtAuthGuard` y `RolesGuard`.
- **Trazabilidad Obligatoria (Bitácora - M6):** Toda creación, actualización, desactivación o cambio de estado debe registrar un evento mediante `AuditLogPort` con `userId`, `action`, `module`, `payload` e `ipAddress`.
- **Soft Delete:** Nunca ejecutar `DELETE` físico en usuarios, ubicaciones, categorías o catálogo; usar `active: false` o el estado correspondiente.
- **Seguridad en Respuestas:** Jamás exponer `password` o hashes en respuestas HTTP ni en los payloads guardados en `audit_logs`.

## 4. Criterio de Aceptación por Fase
Ninguna fase se considera terminada hasta que:
1. Se respete estrictamente la separación `domain` / `application` / `infrastructure` sin fugas de Prisma hacia el dominio.
2. `npm run build` compile con **0 errores** de TypeScript.
3. Todos los controladores y DTOs tengan decoradores de Swagger y el servidor levante en `/api`.
4. Actualizar `@specs/API_CONTRACTS.md` documentando todos los nuevos endpoints, parámetros, cuerpos de petición (JSON) y respuestas exitosas creados en la fase.