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
COPY services/core-iam ./services/core-iam

# Generate Prisma client (output: services/core-iam/node_modules/@prisma/client-iam)
WORKDIR /app/services/core-iam
RUN bunx prisma generate
# Copy generated client into root node_modules so it's accessible at runtime
RUN mkdir -p /app/node_modules/@prisma && \
    cp -r /app/services/core-iam/node_modules/@prisma/client-iam /app/node_modules/@prisma/client-iam
RUN bun run build

FROM node:24.2.0-alpine AS runner
WORKDIR /app/services/core-iam
ENV NODE_ENV=production
RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Runtime dependencies (includes generated prisma client)
COPY --from=builder /app/node_modules /app/node_modules

# Compiled output + prisma schema (for migrations)
COPY --from=builder /app/services/core-iam/dist ./dist
COPY --from=builder /app/services/core-iam/package.json ./
COPY --from=builder /app/services/core-iam/prisma ./prisma

USER nodejs
EXPOSE 8002
ENV PORT=8002
CMD ["node", "dist/src/main.js"]
