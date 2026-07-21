FROM node:24-alpine AS base
WORKDIR /app
COPY --from=oven/bun:1.2-alpine /usr/local/bin/bun /usr/local/bin/bun

FROM base AS deps
RUN apk add --no-cache openssl libc6-compat

COPY package.json bun.lock ./
COPY apps/erp-shell/package.json apps/erp-shell/
COPY apps/crm-ui/package.json apps/crm-ui/
COPY apps/billing-ui/package.json apps/billing-ui/
COPY apps/inventory-ui/package.json apps/inventory-ui/
COPY services/core-iam/package.json services/core-iam/
COPY services/billing-service/package.json services/billing-service/
COPY packages/auth-middleware/package.json packages/auth-middleware/
COPY packages/ui-theme/package.json packages/ui-theme/
RUN --mount=type=cache,target=/root/.cache/bun \
    bun install --frozen-lockfile --ignore-scripts

FROM base AS builder
RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/bun.lock ./
COPY services/billing-service ./services/billing-service

WORKDIR /app/services/billing-service
RUN bun x prisma generate
RUN bun run build

FROM base AS prod-deps
COPY package.json bun.lock ./
COPY apps/erp-shell/package.json apps/erp-shell/
COPY apps/crm-ui/package.json apps/crm-ui/
COPY apps/billing-ui/package.json apps/billing-ui/
COPY apps/inventory-ui/package.json apps/inventory-ui/
COPY services/core-iam/package.json services/core-iam/
COPY services/billing-service/package.json services/billing-service/
COPY packages/auth-middleware/package.json packages/auth-middleware/
COPY packages/ui-theme/package.json packages/ui-theme/
RUN --mount=type=cache,target=/root/.cache/bun \
    bun install --production --frozen-lockfile --ignore-scripts

FROM node:24-alpine AS runner
WORKDIR /app/services/billing-service
ENV NODE_ENV=production \
    PORT=8003

RUN apk add --no-cache openssl dumb-init && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma

COPY --from=builder /app/services/billing-service/dist ./dist
COPY --from=builder /app/services/billing-service/package.json ./
COPY --from=builder /app/services/billing-service/prisma ./prisma

RUN chown -R nodejs:nodejs /app/node_modules/@prisma /app/node_modules/.prisma

USER nodejs
EXPOSE 8003

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/main"]
