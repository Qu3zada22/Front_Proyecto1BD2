# ============================================================
# FastPochi API — Multi-stage Dockerfile
# Build context: repo root (docker build -f apps/api/Dockerfile .)
# ============================================================

# ── Stage 1: builder ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar manifests del workspace raíz y del API
COPY package*.json turbo.json ./
COPY apps/api/package*.json ./apps/api/

# Instalar TODAS las dependencias (hoisting de monorepo)
RUN npm ci

# Copiar fuente del API y scripts de ingesta
COPY apps/api/src        ./apps/api/src
COPY apps/api/tsconfig*.json apps/api/nest-cli.json ./apps/api/
COPY apps/database       ./apps/database

# Compilar
WORKDIR /app/apps/api
RUN npm run build

# ── Stage 2: production ──────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Sólo dependencias de producción
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --omit=dev

# Artefactos compilados
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Scripts de ingesta (necesarios para POST /api/seed)
COPY --from=builder /app/apps/database ./apps/database

# Usuario no-root para seguridad
RUN addgroup -S fastpochi && adduser -S fastpochi -G fastpochi
USER fastpochi

EXPOSE 3000
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
