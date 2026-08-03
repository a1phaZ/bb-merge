FROM node:22-alpine AS ng-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund --fetch-timeout=120000
COPY client/ ./
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

FROM node:22-alpine AS api-build
RUN apk add --no-cache build-base python3
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund --fetch-timeout=120000
COPY tsconfig.json tsconfig.build.json ./
COPY src/ ./src/
RUN npx tsc --project tsconfig.build.json && npm prune --omit=dev --no-audit --no-fund

FROM node:22-alpine AS app
RUN apk add --no-cache tzdata
WORKDIR /app
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/dist ./dist
COPY --from=ng-build /app/public ./public

ENV NODE_ENV=production
ENV PORT=3000
ENV STORAGE_TYPE=file
ENV DATA_DIR=/app/data

EXPOSE 3000
VOLUME ["/app/data", "/app/logs"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]

FROM caddy:alpine AS caddy
COPY --from=ng-build /app/public/browser /srv/public
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
