# 📱 Guía de Configuración de Google Wallet (Generic Passes)

Esta guía documenta los pasos manuales para vincular tu emisor de **Google Wallet** con MyCard y habilitar la generación de pases digitales directamente desde la web (sin app nativa de Android).

---

## 1. Crear el Emisor en Google Pay & Wallet Console

1. Entra en [Google Pay & Wallet Console](https://pay.google.com/business/console).
2. Inicia sesión con tu cuenta de Google (la que administrará el emisor).
3. Selecciona **Google Wallet API** e introduce el nombre de tu organización o proyecto (por ejemplo: `MyCard`).
4. Una vez creado, copia tu **Issuer ID** (un número largo de 19 dígitos, por ejemplo: `3388000000022345678`).

---

## 2. Habilitar la API y Crear la Cuenta de Servicio en Google Cloud Platform

1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto nuevo o selecciona uno existente (ej: `mycard-production`).
3. Ve a **APIs y Servicios** > **Biblioteca** y busca **Google Wallet API** (`walletobjects.googleapis.com`).
4. Haz clic en **Habilitar**.
5. Ve a **IAM y Administración** > **Cuentas de servicio**.
6. Haz clic en **Crear cuenta de servicio**:
   - Nombre: `wallet-issuer`
   - ID: `wallet-issuer@<tu-proyecto>.iam.gserviceaccount.com`
7. Una vez creada, entra en la cuenta de servicio, ve a la pestaña **Claves** > **Agregar clave** > **Crear nueva clave**.
8. Selecciona el tipo **JSON** y descarga el archivo a tu ordenador (ej: `service-account.json`).
   > ⚠️ **Seguridad:** Guarda este archivo en un lugar seguro y NUNCA lo subas a git.

---

## 3. Dar Acceso a la Cuenta de Servicio en la Consola de Wallet

1. Vuelve a [Google Pay & Wallet Console](https://pay.google.com/business/console).
2. Ve al apartado de **Configuración de la cuenta / Usuarios**.
3. Añade el email de tu cuenta de servicio (`wallet-issuer@<tu-proyecto>.iam.gserviceaccount.com`) con rol de **Administrador** o **Desarrollador**.
   *(Este paso es imprescindible: sin él, la API devolverá error 403 al intentar crear o firmar pases).*

---

## 4. Codificar la Clave JSON en Base64

Para que el despliegue en Docker y Dokploy sea limpio y seguro, la clave JSON se inyecta como un único string en Base64 en las variables de entorno.

### En Windows (PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json")) | clip
```
*(El resultado quedará copiado en tu portapapeles).*

### En Linux / VPS:
```bash
base64 -w 0 service-account.json
```

---

## 5. Configurar las Variables de Entorno

En tu archivo `.env` (y posteriormente en las variables de entorno de Dokploy):

```env
GOOGLE_WALLET_ISSUER_ID=3388000000022345678
GOOGLE_WALLET_SERVICE_ACCOUNT_JSON=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...
```

---

## 6. Inicializar la Plantilla del Pase (GenericClass)

Ejecuta el script idempotente que registra la clase del pase en la API de Google:

```bash
npm run wallet:setup
```

El script verificará tus credenciales y creará la clase `${ISSUER_ID}.mycard_business_card_v1`. Puedes ejecutarlo tantas veces como desees si cambias los campos en el futuro.

---

## 7. Modo Demo y Cuentas de Prueba (Test Users)

Mientras tu emisor esté en modo borrador (**Draft**) y no hayas solicitado la aprobación para producción comercial a Google:

1. El emisor solo permite guardar pases en cuentas Google registradas como **usuarios de prueba**.
2. Para que tus 5–20 amigos puedan guardar su tarjeta en su teléfono:
   - Ve a [Google Pay & Wallet Console](https://pay.google.com/business/console).
   - Ve a la sección **Usuarios de prueba** (*Test Users*).
   - Añade las direcciones `@gmail.com` de tus amigos.
3. Con eso, cuando pulsen en **"Añadir a Google Wallet"** desde su teléfono o navegador, el pase se añadirá de inmediato a su Google Wallet sin pedir verificación de empresa.

---

## 8. Consideraciones sobre las Fotos

Google Wallet descarga la foto de perfil/logo del pase realizando peticiones `GET` directamente desde los servidores de Google a tu dominio:

- **URLs Públicas:** La app genera URLs absolutas como `https://mycard.nexus-sales.eu/api/uploads/xxx.webp`. El dominio debe ser accesible públicamente por HTTPS (la ruta `/api/uploads/*` no debe quedar detrás de la VPN ni de autenticación del proxy).
- La ruta `/api/uploads/[filename]` incluye cabeceras `Cache-Control: public, max-age=31536000, immutable` y `X-Content-Type-Options: nosniff` para facilitar la indexación instantánea de Google Wallet.
