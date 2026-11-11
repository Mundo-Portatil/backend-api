# Mercadillo Backend API (`backend-api`)

API RESTful modular construida con **NestJS**, **Prisma ORM** y **PostgreSQL (Supabase)** para la gestión integral del sistema "Mercadillo" (Inventario, POS, Logística, Servicio Técnico y Auditorías).

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu equipo:

* **Node.js**: v18.0.0 o superior (Recomendado v20+)
* **npm**: v9.0.0 o superior
* **Git**

---

## 🚀 Guía de Inicio Rápido (Para Desarrolladores)

Sigue estos pasos para clonar y ejecutar el proyecto en tu máquina local:

### 1. Clonar el Repositorio

```bash
git clone https://github.com/LARMD-2/backend-api.git
cd backend-api
```

### 2. Cambiar a la rama de desarrollo

```bash
git checkout develop
```

### 3. Instalar Dependencias

```bash
npm install
```

### 4. Configurar las Variables de Entorno (`.env`)

Crea un archivo llamado `.env` en la raíz del proyecto (`backend-api/.env`) y solicita las credenciales al administrador o copia la siguiente estructura base:

```env
PORT=3000

# Conexión Transaction Pooler (Puerto 6543)
DATABASE_URL="postgresql://postgres.[REF_PROYECTO]:[CONTRASEÑA_ENCODED]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Conexión Directa para Prisma (Puerto 5432)
DIRECT_URL="postgresql://postgres.[REF_PROYECTO]:[CONTRASEÑA_ENCODED]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Supabase & Auth
SUPABASE_URL="https://[REF_PROYECTO].supabase.co"
SUPABASE_KEY="tu_supabase_anon_or_publishable_key"
JWT_SECRET="clave_secreta_jwt_para_local"
```

> ⚠️ **Nota:** La contraseña en las URLs de conexión a PostgreSQL utiliza *Percent-Encoding* debido a los caracteres especiales. No la modifiques a mano.

### 5. Generar el Cliente de Prisma Local

> ℹ️ **¿Debo ejecutar `npx prisma db push`?**
> **NO.** Las tablas y esquemas ya están creados y sincronizados en la base de datos de Supabase. Solamente necesitas generar el cliente local de TypeScript en tu máquina ejecutando:

```bash
npx prisma generate
```

### 6. Iniciar el Servidor de Desarrollo

```bash
# Modo desarrollo con auto-reload
npm run start:dev
```

El servidor estará corriendo en: `http://localhost:3000`

---

## 📁 Estructura del Proyecto

```text
backend-api/
├── prisma/
│   └── schema.prisma    # Esquema relacional con los 8 módulos del negocio
├── src/
│   ├── app.module.ts    # Módulo raíz de NestJS
│   └── main.ts          # Punto de entrada de la aplicación
├── .env                 # Variables de entorno (NO subir a Git)
├── .gitignore           # Ignorados de Git
└── package.json
```

---

## 🌿 Flujo de Trabajo en Git (GitFlow)

* **`main`**: Rama de producción (Código estable).
* **`develop`**: Rama base de integración diaria.
* **Características nuevas**: Crear ramas hijas desde `develop` con la nomenclatura `feature/nombre-modulo` (ej. `feature/m1-inventory`).

Para subir tus cambios:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/tu-funcionalidad
# ... realiza tus cambios ...
git add .
git commit -m "feat: descripción de los cambios"
git push origin feature/tu-funcionalidad
```