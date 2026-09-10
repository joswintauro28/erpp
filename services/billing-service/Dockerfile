FROM node:22-alpine AS base
WORKDIR /app
COPY --from=oven/bun:1.2-alpine /usr/local/bin/bun /usr/local/bin/bun

# Optional outbound proxy for `apk add` (e.g. Docker Desktop proxy on restricted
# networks). Populated from compose build args; empty by default so normal
# networks fetch directly. Uses a neutral name (not HTTP_PROXY) so bun installs
# in child stages never inherit proxy env — bun breaks on the Docker Desktop
# proxy while apk requires it.
ARG BUILD_PROXY

FROM base AS deps
RUN for i in 1 2 3 4 5; do HTTP_PROXY="${BUILD_PROXY:-}" HTTPS_PROXY="${BUILD_PROXY:-}" apk add --no-cache openssl libc6-compat && break || sleep 3; done && apk info -e openssl

COPY package.json bun.lock nx.json ./
COPY apps/erp-shell/package.json apps/erp-shell/
COPY apps/crm-ui/package.json apps/crm-ui/
COPY apps/billing-ui/package.json apps/billing-ui/
COPY apps/inventory-ui/package.json apps/inventory-ui/
COPY services/core-iam/package.json services/core-iam/
COPY services/billing-service/package.json services/billing-service/
COPY packages/auth-middleware/package.json packages/auth-middleware/
COPY packages/ui-theme/package.json packages/ui-theme/
RUN --mount=type=cache,target=/root/.cache/bun,sharing=shared \
    bun install --frozen-lockfile --ignore-scripts

FROM base AS builder
RUN for i in 1 2 3 4 5; do HTTP_PROXY="${BUILD_PROXY:-}" HTTPS_PROXY="${BUILD_PROXY:-}" apk add --no-cache openssl && break || sleep 3; done && apk info -e openssl

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/bun.lock ./
COPY services/billing-service ./services/billing-service

WORKDIR /app/services/billing-service
RUN --mount=type=cache,target=/root/.cache/bun \
    bun x prisma generate
RUN bun run build

# Derive from deps (not base) so this runs AFTER the full install: node_modules
# and the bun cache are already warm, and --offline prunes devDeps with zero
# network. A standalone prod-deps install raced the deps install on slow
# networks and failed with ConnectionRefused.
FROM deps AS prod-deps
RUN --mount=type=cache,target=/root/.cache/bun,sharing=shared \
    bun install --production --frozen-lockfile --ignore-scripts --offline

FROM node:22-alpine AS runner
COPY --from=oven/bun:1.2-alpine /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app/services/billing-service
ENV NODE_ENV=production \
    PORT=8003

ARG BUILD_PROXY

RUN for i in 1 2 3 4 5; do HTTP_PROXY="${BUILD_PROXY:-}" HTTPS_PROXY="${BUILD_PROXY:-}" apk add --no-cache openssl dumb-init && break || sleep 3; done && apk info -e openssl && \
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
