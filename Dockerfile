# syntax=docker/dockerfile:1
# --- build: compile the SPA -------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
# tsc + vite can exceed the default heap on small VMs: cap it explicitly (add swap on < 2 GB).
ENV NODE_OPTIONS=--max-old-space-size=2048

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- runtime: nginx serves the static files and proxies /api (HTTP + WebSocket) ----------
FROM nginx:1.27-alpine AS runner

RUN apk add --no-cache openssl curl \
    && rm -f /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx/app.conf /etc/nginx/case2code/app.conf
COPY deploy/nginx/http.conf /etc/nginx/case2code/http.conf
COPY deploy/nginx/https.conf.template /etc/nginx/case2code/https.conf.template
# The official image runs every /docker-entrypoint.d/*.sh before starting nginx.
COPY deploy/nginx/40-case2code-config.sh /docker-entrypoint.d/40-case2code-config.sh
RUN chmod +x /docker-entrypoint.d/40-case2code-config.sh

EXPOSE 80 443
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD curl -fsS http://127.0.0.1/healthz || exit 1
