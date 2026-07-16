FROM node:24-alpine AS deps
WORKDIR /app
COPY --from=oven/bun:1.2-alpine /usr/local/bin/bun /usr/local/bin/bun

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
RUN bun install --frozen-lockfile --ignore-scripts

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=oven/bun:1.2-alpine /usr/local/bin/bun /usr/local/bin/bun

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/bun.lock ./
COPY services/core-iam ./services/core-iam
COPY packages ./packages

# Generate Prisma client (output: services/core-iam/node_modules/@prisma/client-iam)
WORKDIR /app/services/core-iam
RUN bunx prisma generate
# Copy generated client into root node_modules so it's accessible at runtime
RUN mkdir -p /app/node_modules/@prisma && \
    cp -r /app/services/core-iam/node_modules/@prisma/client-iam /app/node_modules/@prisma/client-iam
RUN bun run build

FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY --from=oven/bun:1.2-alpine /usr/local/bin/bun /usr/local/bin/bun

COPY package.json bun.lock ./
COPY apps/erp-shell/package.json apps/erp-shell/
COPY apps/crm-shell/package.json apps/crm-shell/
COPY apps/billing-ui/package.json apps/billing-ui/
COPY apps/inventory-ui/package.json apps/inventory-ui/
COPY services/core-iam/package.json services/core-iam/
COPY services/billing-service/package.json services/billing-service/
COPY packages/auth-middleware/package.json packages/auth-middleware/
COPY packages/ui-theme/package.json packages/ui-theme/
RUN bun install --production --frozen-lockfile --ignore-scripts

FROM node:24-alpine AS runner
WORKDIR /app/services/core-iam
ENV NODE_ENV=production
RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Runtime dependencies (includes production node_modules and generated prisma client)
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma

# Compiled output + prisma schema (for migrations)
COPY --from=builder /app/services/core-iam/dist ./dist
COPY --from=builder /app/services/core-iam/package.json ./
COPY --from=builder /app/services/core-iam/prisma ./prisma

RUN chown -R nodejs:nodejs /app/node_modules/@prisma

USER nodejs
EXPOSE 8002
ENV PORT=8002
CMD ["node", "dist/src/main.js"]

