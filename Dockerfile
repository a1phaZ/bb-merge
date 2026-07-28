FROM node:22-alpine AS ng-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS api-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src/ ./src/
RUN npx tsc --project tsconfig.build.json

FROM node:20-alpine AS app
RUN apk add --no-cache tzdata
WORKDIR /app
COPY --from=api-build /app/dist ./dist
COPY --from=ng-build /app/public ./public
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

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
