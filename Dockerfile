# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage (production-only dependencies)
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
RUN chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "if [ \"${RUN_MIGRATIONS:-true}\" = \"true\" ]; then i=1; until node ./node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run; do [ \"$i\" -ge 5 ] && exit 1; i=$((i+1)); sleep 3; done; fi && exec node dist/main.js"]
