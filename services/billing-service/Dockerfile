FROM oven/bun:1.2 AS deps
WORKDIR /app
COPY package.json bun.lock ./
# Copy all workspace package.json files so Bun resolves the full dependency graph
COPY apps/erp-shell/package.json apps/erp-shell/
COPY apps/crm-shell/package.json apps/crm-shell/
COPY apps/billing-ui/package.json apps/billing-ui/
COPY apps/inventory-ui/package.json apps/inventory-ui/
COPY services/core-iam/package.json services/core-iam/
COPY services/billing-service/package.json services/billing-service/
COPY packages/auth-middleware/package.json packages/auth-middleware/
COPY packages/ui-theme/package.json packages/ui-theme/
RUN bun install

FROM oven/bun:1.2 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/bun.lock ./
COPY services/billing-service ./services/billing-service

# Generate Prisma client (default output: ../../node_modules/@prisma/client — already at root)
WORKDIR /app/services/billing-service
RUN bunx prisma generate
RUN bun run build

FROM node:24.2.0-alpine AS runner
WORKDIR /app/services/billing-service
ENV NODE_ENV=production
RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/services/billing-service/dist ./dist
COPY --from=builder /app/services/billing-service/package.json ./
COPY --from=builder /app/services/billing-service/prisma ./prisma

USER nodejs
EXPOSE 8003
ENV PORT=8003
CMD ["node", "dist/main"]
