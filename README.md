# 🪪 MyCard — Tarjetas de Visita Digitales Seguras

Aplicación web moderna y minimalista de tarjetas de visita digitales (*digital business cards*) diseñada para uso personal y para un grupo cerrado de amigos (5–20 usuarios). 

No es un SaaS comercial: prioriza **simplicidad, privacidad, seguridad estricta y facilidad de mantenimiento** sobre complejidades innecesarias.

---

## 📑 Tabla de Contenidos

1. [Características Principales](#-características-principales)
2. [Stack Tecnológico](#-stack-tecnológico)
3. [Decisiones de Arquitectura y Seguridad](#-decisiones-de-arquitectura-y-seguridad)
4. [Estructura del Proyecto](#-estructura-del-proyecto)
5. [Puesta en Marcha en Local](#-puesta-en-marcha-en-local)
6. [Flujo de Administración y Usuarios](#-flujo-de-administración-y-usuarios)
7. [Endpoints y Rutas de la Aplicación](#-endpoints-y-rutas-de-la-aplicación)
8. [Despliegue y Producción](#-despliegue-y-producción)
9. [Batería de Tests](#-batería-de-tests)
10. [Documentación Complementaria](#-documentación-complementaria)

---

## ✨ Características Principales

- **🔒 Registro Estrictamente Privado:** Sin registro público. Acceso exclusivo mediante enlaces de invitación de un solo uso generados por el administrador con caducidad configurable.
- **🎨 3 Plantillas Profesionales:** Plantillas móvil-first (*Minimalista*, *Ejecutiva* y *Creativa*) que respetan la paleta de colores y tipografía elegida por el usuario.
- **⚡ Vista Previa en Vivo:** El panel de edición reacciona en tiempo real a los cambios de contenido, plantilla y colores sin necesidad de guardar primero.
- **🖼️ Procesamiento Seguro de Imágenes:** Subida de avatar y banner con validación de tipo MIME real por *magic bytes*, redimensionado automático, conversión a WebP y eliminación completa de metadatos EXIF con `sharp`.
- **📇 Descarga vCard 3.0 (RFC 2426 / 6350):** Generación de archivo `.vcf` con plegado de líneas, saneamiento de inyecciones y foto de perfil optimizada. Compatible con iOS y Android.
- **📱 Código QR Dinámico:** Generación interactiva de QR vectorial (SVG) y rasterizado HD (PNG) con verificación de ratio de contraste accesible (WCAG). El QR apunta siempre a la URL pública, por lo que nunca caduca al cambiar los datos.
- **💳 Integración Oficial con Google Wallet:** Generación de pases digitales (*Generic Passes*) que los contactos pueden guardar en la app Google Wallet de sus teléfonos con un solo clic. Sincronización en segundo plano al editar la tarjeta.
- **👁️ Contador de Visitas Anónimo:** Métrica de visualizaciones que descarta rastreadores/bots y visitas del propio usuario autenticado. No almacena IPs, User-Agents ni información de geolocalización.
- **🛡️ Seguridad Perimetral Completa:** Cabeceras de seguridad estrictas (CSP con nonces dinámicos, HSTS, `frame-ancestors 'none'`), rate limiting en memoria y mitigación de spoofing de IP (`X-Forwarded-For` leído desde la derecha según `TRUSTED_PROXY_HOPS`).

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Justificación |
| :--- | :--- | :--- |
| **Framework Full-Stack** | Next.js 16 (App Router) + React 19 | Una sola aplicación para Server Actions, Route Handlers y UI reactiva sin API backend separada. |
| **Lenguaje** | TypeScript (Modo Estricto) | Seguridad tipada de extremo a extremo entre base de datos, validaciones y componentes. |
| **Estilos & UI** | Tailwind CSS v4 + Lucide Icons | Estilos modernos y utilitarios con soporte para temas oscuros y animaciones fluidas. |
| **Base de Datos & ORM** | PostgreSQL 16 + Prisma ORM | Integridad referencial con índices específicos, migraciones declarativas y relaciones en cascada. |
| **Criptografía & Auth** | `argon2id` + `node:crypto` | Hashing resistente a GPU para contraseñas y tokens de sesión de 32 bytes con hash SHA-256 en BD. |
| **Procesamiento Gráfico** | `sharp` | Manipulación de imágenes de alto rendimiento en C++ para redimensionar y eliminar EXIF. |
| **Testing** | Vitest | Suite de tests unitarios rápida para flujos criptográficos, validaciones Zod y vCard. |
| **Despliegue** | Docker Standalone + Dokploy + Traefik | Contenedores ligeros multi-stage con usuario no-root desplegados en VPS Hetzner tras Traefik. |

---

## 🛡️ Decisiones de Arquitectura y Seguridad

1. **Autenticación sin JWT en el navegador:**
   - La cookie de sesión (`__Host-sid` en producción / `sid` en local) es `httpOnly`, `Secure` y `SameSite=Lax`.
   - Contiene un token aleatorio criptográfico de 32 bytes.
   - En la base de datos **solo se almacena el hash SHA-256** del token. Si la base de datos se filtrara, ninguna sesión activa quedaría comprometida.
2. **Defensa contra IDOR (Insecure Direct Object Reference):**
   - En todos los Server Actions y Route Handlers (`updateCardAction`, `uploadCardImageAction`, `/api/wallet/google`), el sistema obtiene la tarjeta del usuario consultando `userId: sessionUser.id`.
   - La interfaz no envía identificadores de tarjeta en peticiones de mutación; ningún usuario puede modificar ni leer datos de la tarjeta de otro usuario.
3. **Validación Zod Bidireccional:**
   - Todas las entradas (redes sociales, enlaces, teléfonos, configuraciones de color, formularios de login e invitaciones) se sanean y validan con esquemas Zod estrictos tanto en cliente como en servidor.
4. **Protección contra IP Spoofing:**
   - Detrás de Traefik, la IP del cliente se toma de `X-Forwarded-For` contando desde la derecha (`TRUSTED_PROXY_HOPS`, por defecto 1), nunca el primer valor, que controla el cliente.
5. **Aislamiento de Base de Datos:**
   - La app usa un PostgreSQL existente en Dokploy con un rol propio (`mycard_app`) sin superusuario y limitado a su base; el contenedor de la app no publica puertos.

---

## 📂 Estructura del Proyecto

```
.
├── DEPLOY.md                  # Manual de despliegue en Dokploy
├── WALLET.md                  # Configuración paso a paso de Google Wallet Console
├── Dockerfile                 # Imagen de producción multi-stage (Next.js standalone)
├── docker-compose.yml         # Producción en Dokploy (solo la app; Postgres externo)
├── docker-compose.local.yml   # Orquestación para pruebas locales
├── docker-entrypoint.sh       # Script de arranque con migraciones automáticas de Prisma
├── prisma/
│   ├── schema.prisma          # Esquema de datos (User, Session, Invite, Card, CardContent)
│   ├── seed.js                # Script para inicializar el primer administrador
│   └── migrations/            # Historial de migraciones SQL para prisma migrate deploy
├── scripts/
│   └── wallet-setup.ts        # Script idempotente para crear/actualizar la clase en Google Wallet
├── src/
│   ├── app/                   # App Router de Next.js
│   │   ├── admin/             # Panel de administración (invitaciones y usuarios)
│   │   ├── api/
│   │   │   ├── health/        # Sonda de monitorización (/api/health)
│   │   │   ├── uploads/       # Servicio seguro de imágenes procesadas (/api/uploads/[filename])
│   │   │   └── wallet/        # Endpoint autenticado de Google Wallet (/api/wallet/google)
│   │   ├── c/[slug]/          # Tarjeta pública, vCard y enlace Wallet del visitante
│   │   ├── dashboard/         # Panel interactivo de edición del usuario
│   │   ├── invite/[token]/    # Canje de invitación y alta / reseteo de cuenta
│   │   └── login/             # Inicio de sesión seguro
│   ├── components/            # Componentes React (dashboard, plantillas, QR, Wallet)
│   ├── lib/                   # Librerías internas
│   │   ├── actions/           # Server Actions (auth, admin, card, invite)
│   │   ├── crypto.ts          # Generación y hash de tokens SHA-256
│   │   ├── ip.ts              # Extracción anti-spoofing de IP de cliente
│   │   ├── prisma.ts          # Instancia singleton del cliente Prisma
│   │   ├── qr.ts              # Generación de códigos QR y contraste WCAG
│   │   ├── rate-limit.ts      # Limitador de tasa en memoria por ventana deslizante
│   │   ├── session.ts         # Gestión de cookies y sesiones autenticadas
│   │   ├── upload.ts          # Sanitización y redimensionado de imágenes con sharp
│   │   ├── validations.ts     # Esquemas de validación Zod
│   │   ├── vcard.ts           # Motor generador de vCard 3.0 RFC 2426/6350
│   │   └── wallet.ts          # Motor JWT RS256 y API REST de Google Wallet
│   ├── proxy.ts               # Inyección de CSP con nonces dinámicos y protección de rutas
│   └── __tests__/             # Suite de 63 tests unitarios (Vitest)
└── package.json
```

---

## 💻 Puesta en Marcha en Local

### 1. Requisitos Previos
- Node.js 20+ (o 22+)
- PostgreSQL en ejecución local (o vía Docker)

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Configuración del Entorno
Copia el archivo de ejemplo y rellena tus datos:
```bash
cp .env.example .env
```
Parámetros esenciales en `.env`:
```env
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/mycard?schema=public
SESSION_COOKIE_NAME=sid
SESSION_DURATION_SECONDS=604800
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe1234!
ADMIN_NAME=Administrador
```

### 4. Base de Datos y Creación del Admin Inicial
```bash
# Aplicar migraciones en PostgreSQL
npx prisma migrate deploy

# O sincronizar esquema directamente
npm run db:push

# Crear el primer usuario administrador con las credenciales del .env
npm run db:seed
```

### 5. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
Abre en el navegador: [http://localhost:3000](http://localhost:3000).

---

## 👥 Flujo de Administración y Usuarios

```
[ Admin ] ────> Inicia sesión en /login
   │
   ├────> Entra en /admin
   ├────> Genera un enlace de invitación (con o sin email prefijado, duración en horas)
   │
   ▼
[ Amigo / Usuario ] ────> Abre enlace: https://nexus-sales.eu/invite/<token_secreto>
   │
   ├────> Elige su Nombre, Contraseña y Slug personal (ej: "carlos")
   ├────> Se crea automáticamente su cuenta, sesión y tarjeta digital
   │
   ▼
[ Panel /dashboard ] ────> Personaliza su tarjeta:
   ├─ Edita cargo, empresa, bio, teléfono, email, web, dirección y redes sociales.
   ├─ Selecciona qué datos sensibles desea mostrar u ocultar.
   ├─ Sube avatar y banner (se convierten a WebP optimizado).
   ├─ Elige plantilla (Minimalista, Ejecutiva o Creativa), colores y tipografía.
   ├─ Descarga su código QR en PNG de alta definición o SVG vectorial.
   └─ Añade su pase oficial a Google Wallet.
```

---

## 🌐 Endpoints y Rutas de la Aplicación

| Ruta | Método | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | Público | Página de inicio con acceso a login y estado del servicio. |
| `/login` | `GET`, `POST` | Público | Autenticación de usuarios con rate limiting (5 intentos/min) y mitigación de timing attacks. |
| `/invite/[token]` | `GET`, `POST` | Público con Token | Canje de invitación única para registro o reseteo de contraseña. |
| `/dashboard` | `GET` | Autenticado | Panel de control reactivo para editar la propia tarjeta y ver estadísticas. |
| `/admin` | `GET` | Rol ADMIN | Gestión de invitaciones activas, lista de usuarios y desactivación de cuentas. |
| `/c/[slug]` | `GET` | Público | Tarjeta digital interactiva móvil-first con OpenGraph tags y contador anónimo. |
| `/c/[slug]/vcard` | `GET` | Público | Descarga de contacto `.vcf` formateado según RFC 2426/6350. |
| `/c/[slug]/wallet` | `GET` | Público | Redirección oficial para guardar el pase en la app Google Wallet del visitante. |
| `/api/wallet/google`| `GET` | Autenticado | Endpoint para que el propietario genere o actualice su pase de Wallet. |
| `/api/uploads/[file]`| `GET` | Público | Servicio de imágenes WebP con protección contra Path Traversal y caché inmutable. |
| `/api/health` | `GET` | Sondas / Público | Healthcheck que valida estado de PostgreSQL y del volumen de uploads. |

---

## 🚢 Despliegue y Producción

El proyecto está diseñado para desplegarse mediante **Dokploy** en una VPS de **Hetzner** desde GitHub, detrás de **Traefik** y con un PostgreSQL existente:

1. **Docker Multi-Stage Standalone:** Compilación optimizada que no incluye dependencias de desarrollo ni ficheros fuente innecesarios.
2. **Entorno sin Secretos en Imagen:** Las claves privadas y contraseñas se inyectan en tiempo de ejecución mediante variables de entorno de Dokploy.
3. **Migraciones Automáticas en el Arranque:** El contenedor ejecuta `npx prisma migrate deploy` antes de servir tráfico en el puerto 3000.
4. **Guía de Despliegue Detallada:** Consulta el archivo [DEPLOY.md](file:///e:/IA/Nuevas%20Ideas/My%20Card/DEPLOY.md) para la configuración paso a paso de:
   - Creación de la base `mycard` y del rol `mycard_app` (SQL).
   - Routing con Traefik en Dokploy y variables de entorno.
   - Backups de Dokploy hacia un S3 Destination (MinIO), con copia externa y prueba de restauración.
   - Monitorización con Uptime Kuma y checklist de seguridad.

---

## 🧪 Batería de Tests

El proyecto cuenta con **68 tests unitarios** que verifican exhaustivamente todas las capas críticas:

```bash
# Ejecutar todos los tests unitarios
npm test

# Ejecutar tests en modo observador (watch)
npm run test:watch
```

Cobertura de pruebas:
- **`phase1.test.ts` & `auth-flow.test.ts`:** Criptografía de tokens SHA-256, hash de contraseñas Argon2id, rate limiting en memoria, validaciones de email y slug.
- **`phase2.test.ts`:** Detección de magic bytes en imágenes, límites de subida de ficheros, sanitización de esquemas de tema y plantillas.
- **`phase3.test.ts`:** Plegado de líneas a 75 caracteres y escape de caracteres hostiles en vCard 3.0, cálculo de contraste WCAG en códigos QR, filtrado de bots en métricas.
- **`phase4.test.ts`:** Firma criptográfica JWT con RS256 para Google Wallet, identificadores deterministas del Generic Object, manejo de credenciales ausentes.
- **`phase5.test.ts`:** Resolución de IP desde `X-Forwarded-For` con cabeceras falsificadas y `TRUSTED_PROXY_HOPS`, presencia de cabeceras de seguridad CSP con nonces dinámicos y estructura del healthcheck.

---

## 📚 Documentación Complementaria

- 📘 [DEPLOY.md](file:///e:/IA/Nuevas%20Ideas/My%20Card/DEPLOY.md): Manual de despliegue en Dokploy, base de datos, backups, Uptime Kuma y checklist de seguridad.
- 📱 [WALLET.md](file:///e:/IA/Nuevas%20Ideas/My%20Card/WALLET.md): Guía de configuración en Google Pay & Wallet Console y Google Cloud Platform.
- ⚙️ [.env.example](file:///e:/IA/Nuevas%20Ideas/My%20Card/.env.example): Variables de entorno documentadas para local y producción.
