# ==========================================
# Multi-Stage Dockerfile para MyCard (Next.js Standalone)
# Producción segura, usuario no-root, sin secretos
# ==========================================

# ── 1. Etapa de Dependencias ──
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# ── 2. Etapa de Compilación ──
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── 3. Etapa de Ejecución (Runner) ──
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl wget
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV UPLOAD_DIR="/app/uploads"

# Crear usuario y grupo no-root para ejecución segura
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Crear directorio de subidas con permisos asignados al usuario no-root
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# Copiar artefactos de compilación standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar esquema Prisma y CLI para migraciones automáticas en arranque
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copiar script de arranque seguro
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
