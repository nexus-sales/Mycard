#!/bin/sh
set -e

echo "==> [MyCard] Iniciando contenedor de producción..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: La variable DATABASE_URL es obligatoria."
  exit 1
fi

echo "==> [MyCard] Ejecutando migraciones de Prisma (prisma migrate deploy)..."
node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

echo "==> [MyCard] Directorio de subidas configurado en: ${UPLOAD_DIR:-/app/uploads}"
mkdir -p "${UPLOAD_DIR:-/app/uploads}"

echo "==> [MyCard] Arrancando aplicación Next.js standalone..."
exec "$@"
