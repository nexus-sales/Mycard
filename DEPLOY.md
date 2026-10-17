# 🚀 Guía de Despliegue en Dokploy

Despliegue de **MyCard** en una VPS Hetzner con **Dokploy** y **Traefik**, desde GitHub, usando el **PostgreSQL ya existente** en Dokploy. El acceso SSH y el panel de Dokploy ya están restringidos por VPN; esta guía no los cubre.

---

## 1. Arquitectura

```
[ Internet ] ──HTTPS──▶ [ Traefik (Dokploy) ] ──dokploy-network──▶ [ Contenedor app :3000 ]
                          Let's Encrypt                              - usuario no-root
                          añade X-Forwarded-For                      - volumen mycard_uploads_data
                                                                     - healthcheck /api/health
                                                                            │ DATABASE_URL
                                                                            ▼
                                                              [ PostgreSQL existente en Dokploy ]
                                                              base "mycard", rol "mycard_app"
```

- `docker-compose.yml` contiene **solo la app**. No publica puertos; Traefik llega a ella por la red interna `dokploy-network`.
- Las tablas las crea la propia app: al arrancar ejecuta `prisma migrate deploy`.

---

## 2. Base de datos: crear base y rol

Conéctate al PostgreSQL de Dokploy como superusuario (terminal del servicio en Dokploy, o `psql` por la VPN) y ejecuta. Sustituye la contraseña por una de 32+ caracteres aleatorios (`openssl rand -base64 32 | tr -d '/+=' | cut -c1-32`).

```sql
-- 1. Rol de aplicación: sin superusuario ni privilegios de administración
CREATE ROLE mycard_app WITH
  LOGIN
  PASSWORD 'CAMBIAR_POR_CONTRASENA_FUERTE_32_CARACTERES'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- 2. Base de datos propia; el rol es su propietario (necesario para que
--    "prisma migrate deploy" cree tipos y tablas y la tabla _prisma_migrations)
CREATE DATABASE mycard OWNER mycard_app ENCODING 'UTF8';

-- 3. Nadie más puede conectarse a esta base
REVOKE ALL ON DATABASE mycard FROM PUBLIC;
GRANT CONNECT ON DATABASE mycard TO mycard_app;

-- 4. Y mycard_app no debe poder tocar las demás bases
--    (comprueba que no tiene CONNECT por PUBLIC en las existentes, ver verificación)
```

```sql
-- 5. Dentro de la base mycard (en psql: \c mycard)
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO mycard_app;
```

Verificación:

```sql
-- Debe devolver: mycard_app | f | f | f
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = 'mycard_app';

-- Bases a las que puede conectar mycard_app (idealmente solo "mycard"; si aparecen otras,
-- es porque tienen CONNECT concedido a PUBLIC: revócalo con REVOKE CONNECT ON DATABASE x FROM PUBLIC)
SELECT datname FROM pg_database WHERE has_database_privilege('mycard_app', datname, 'CONNECT');
```

> `prisma migrate deploy` no usa shadow database, por lo que **no** hace falta `CREATEDB`.

### DATABASE_URL

```
# Postgres en el mismo servidor (red de Dokploy): usa el nombre interno del servicio
DATABASE_URL=postgresql://mycard_app:CONTRASENA@NOMBRE_SERVICIO_POSTGRES:5432/mycard?schema=public

# Postgres en OTRO servidor: cifrado obligatorio
DATABASE_URL=postgresql://mycard_app:CONTRASENA@HOST:5432/mycard?schema=public&sslmode=require
```

- Si la contraseña tiene caracteres especiales, codifícalos en URL (o usa solo alfanuméricos).
- Con `sslmode=require` el cliente cifra pero **no verifica** el certificado. Si el servidor tiene un certificado de CA propia, usa `sslmode=verify-full&sslrootcert=/ruta/ca.pem`.
- Si el PostgreSQL está en otro servidor, limita en su `pg_hba.conf`/firewall el acceso a la IP de este servidor (o a la VPN) y exige `hostssl`.
- El nombre del servicio Postgres está en Dokploy → servicio → *Internal Host*. Para que el contenedor de la app lo resuelva, ambos deben compartir red (`dokploy-network`).

---

## 3. Despliegue en Dokploy desde GitHub

1. Sube el código a un repositorio de GitHub (no subas `.env`; está en `.gitignore`).
2. En Dokploy: **Project** `MyCard` → **Create Service** → **Compose** → *Provider: GitHub* → repositorio y rama; *Compose path*: `./docker-compose.yml`.
3. **Environment**:

| Variable | Valor | Notas |
| :--- | :--- | :--- |
| `APP_URL` | `https://nexus-sales.eu` | Sin barra final (obligatoria) |
| `APP_DOMAIN` | `nexus-sales.eu` | Para la regla de Traefik del compose |
| `DATABASE_URL` | ver sección 2 | Obligatoria |
| `TRUSTED_PROXY_HOPS` | `1` | Proxies de confianza delante de la app (solo Traefik = 1) |
| `SESSION_COOKIE_NAME` | `__Host-sid` | |
| `SESSION_DURATION_SECONDS` | `604800` | |
| `GOOGLE_WALLET_ISSUER_ID` | `3388...` | Ver [WALLET.md](WALLET.md) |
| `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` | base64 | |

4. **Dominio / HTTPS**: el compose lleva etiquetas de Traefik con el resolver `letsencrypt`. Comprueba que ese nombre coincide con el de tu Traefik (mira otra app tuya). Alternativa: quita las etiquetas y añade el dominio en la pestaña **Domains** de Dokploy (servicio `app`, puerto `3000`, HTTPS + Let's Encrypt). No uses ambos a la vez.
5. **Deploy**. Revisa los logs: debe aparecer `prisma migrate deploy` aplicando `20261016000000_init`.
6. Comprueba `https://nexus-sales.eu/api/health` → `200 {"status":"healthy"}`.
7. Crea el primer administrador. En Dokploy → servicio `app` → **Terminal** (shell `sh`), ejecuta una sola vez:
   ```bash
   ADMIN_EMAIL='tu@email.com' ADMIN_PASSWORD='contraseña-de-12+-caracteres' ADMIN_NAME='Tu Nombre' node prisma/seed.js
   ```
   Las credenciales solo existen durante ese comando; no se guardan en el compose ni en el entorno del contenedor. Si el usuario ya existe, no hace nada. Después, borra la contraseña del historial de la terminal y cámbiala desde la app si lo prefieres.

### IP del cliente y rate limiting

La app lee `X-Forwarded-For` **contando desde la derecha** según `TRUSTED_PROXY_HOPS` (nunca el primer valor, que controla el cliente) y usa esa IP en todo el rate limiting. Con Traefik directamente expuesto a Internet, el valor correcto es `1`. Si algún día pones otro proxy delante (CDN, balanceador), súmalo a `TRUSTED_PROXY_HOPS`; si lo pones mal, la IP resuelta será incorrecta (la de un proxy) y todos los usuarios compartirán cuota.

---

## 4. Backups

### Base de datos (función de Dokploy)

1. **Settings → S3 Destinations → Add**: endpoint de MinIO (`https://minio.tudominio.com`), región (`us-east-1`), bucket `mycard-backups`, access key y secret key de un usuario MinIO con permiso solo sobre ese bucket. Pulsa **Test Connection**.
2. Servicio PostgreSQL → **Backups → Create Backup**: *Database* `mycard`, *Destination* el creado, *Schedule* `0 3 * * *`, *Prefix* `mycard`, *Keep latest* `14`.
3. Pulsa **Run Manual Backup** y comprueba que aparece el archivo en el bucket.

> ⚠️ **Un destino en la misma VPS no es una copia externa.** Si MinIO corre en este servidor, un fallo del disco, un borrado del servidor o un compromiso del host se llevan base de datos **y** copias. Añade un **segundo destino externo** (otro proveedor o ubicación: Hetzner Storage Box/Object Storage, Backblaze B2, Wasabi, o un MinIO en otra máquina) y programa en Dokploy una segunda tarea de backup hacia él.

### Volumen de imágenes (`mycard_uploads_data`)

Dokploy respalda las bases de datos, no los volúmenes del Compose. Opciones:

- **Volume Backups** de Dokploy, si tu versión lo ofrece (servicio → *Volume Backups*), hacia el mismo S3 Destination.
- Si no, un cron en el host (o una *Schedule job* de Dokploy) con la CLI de MinIO:
  ```bash
  docker run --rm -v mycard_uploads_data:/uploads:ro -v /tmp:/out alpine \
    tar -czf /out/uploads_$(date +%Y%m%d).tar.gz -C /uploads .
  mc cp /tmp/uploads_*.tar.gz externo/mycard-backups/uploads/ && rm /tmp/uploads_*.tar.gz
  ```
  Programa dos copias: una al MinIO y otra al destino externo.

### Prueba de restauración (hazla antes de lanzar y cada trimestre)

1. Descarga el último backup de la base desde el bucket (o desde Dokploy → Backups → *Restore*).
2. Restáuralo en una base **de prueba**, nunca sobre producción:
   ```sql
   CREATE DATABASE mycard_restore OWNER mycard_app;
   ```
   ```bash
   gunzip -c mycard_FECHA.sql.gz | psql -U mycard_app -d mycard_restore
   ```
   (Si el backup está en formato custom, usa `pg_restore -U mycard_app -d mycard_restore archivo.dump`.)
3. Verifica filas: `SELECT count(*) FROM "User"; SELECT count(*) FROM "Card";`
4. Imágenes: `tar -xzf uploads_FECHA.tar.gz -C /ruta/vacia` y comprueba que abren.
5. Elimina la base de prueba: `DROP DATABASE mycard_restore;`
6. Restauración real (desastre): para la app, restaura sobre una base `mycard` vacía, restaura el volumen, arranca la app y comprueba `/api/health`.

---

## 5. Monitorización con Uptime Kuma

Crea estos monitores (intervalo 60 s, reintentos 3):

| Monitor | Tipo | Configuración |
| :--- | :--- | :--- |
| MyCard – Salud | HTTP(s) – Keyword | URL `https://nexus-sales.eu/api/health`, keyword `"status":"healthy"`, método GET. Detecta caída de app **y** de base de datos/almacenamiento |
| MyCard – Web | HTTP(s) | URL `https://nexus-sales.eu/login`, código `200-299` |
| MyCard – Certificado | HTTP(s) | Activa *Certificate Expiry Notification* (avisa a 21/14/7 días) |
| Postgres | TCP Port | Host y puerto 5432 del PostgreSQL, **solo desde la red interna/VPN** |
| Backups (opcional) | Push | Crea el monitor Push y haz que la tarea de backup llame a su URL al terminar; *Heartbeat interval* 26 h. Si un día no hay backup, salta la alarma |

Notificaciones: configura al menos un canal (email/Telegram) y asígnalo a todos los monitores. Comprueba que una parada de prueba (`Stop` del servicio en Dokploy) genera aviso.

---

## 6. Checklist de seguridad final

- [ ] **Sin puertos publicados:** `docker ps` muestra la app sin `0.0.0.0:...->`; solo se llega por Traefik.
- [ ] **Base de datos no expuesta a Internet:** el PostgreSQL no tiene el 5432 publicado en la IP pública (`nc -vz IP_PUBLICA 5432` falla desde fuera).
- [ ] **Rol mínimo:** `mycard_app` no es superusuario y solo conecta a la base `mycard` (consultas de verificación de la sección 2).
- [ ] **SSL de base de datos:** si Postgres está en otro servidor, `DATABASE_URL` lleva `sslmode=require` (o `verify-full`).
- [ ] **HTTPS válido y redirección:** `http://` redirige a `https://`; certificado de Let's Encrypt emitido.
- [ ] **IP del cliente:** con `TRUSTED_PROXY_HOPS=1`, enviar `X-Forwarded-For: 1.2.3.4` falsificado no cambia el cubo de rate limit (6 intentos fallidos en `/login` → 429 aunque cambies la cabecera en cada intento).
- [ ] **Cookie `__Host-sid`:** presente en producción con `Secure`, `HttpOnly`, `Path=/`.
- [ ] **CSP sin violaciones:** la consola del navegador no muestra bloqueos.
- [ ] **Registro cerrado:** `/register` devuelve 404; solo se entra por `/invite/<token>`.
- [ ] **Healthcheck:** `/api/health` devuelve 200 y Dokploy marca el contenedor como *healthy*.
- [ ] **Backups:** backup manual ejecutado, copia externa configurada y **prueba de restauración completada**.
- [ ] **Uptime Kuma:** monitores creados y alerta de prueba recibida.
- [ ] **Secretos:** `.env` no está en el repositorio; la contraseña de `mycard_app` es única de esta app.
