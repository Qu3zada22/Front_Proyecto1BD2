# ============================================================
# FastPochi Client — Multi-stage Dockerfile
# Build context: repo root (docker build -f apps/client/Dockerfile .)
# ============================================================

# ── Stage 1: builder ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json turbo.json ./
COPY apps/client/package*.json ./apps/client/

RUN npm ci --workspace=apps/client

COPY apps/client/ ./apps/client/

# VITE_API_URL se pasa como build arg para embeber en el bundle
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app/apps/client
RUN npm run build

# ── Stage 2: nginx ────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

COPY --from=builder /app/apps/client/dist /usr/share/nginx/html
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
