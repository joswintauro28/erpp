FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=oven/bun:1.2-alpine /usr/local/bin/bun /usr/local/bin/bun

# Optional outbound proxy for `apk add` (e.g. Docker Desktop proxy on restricted
# networks). Populated from compose build args; empty by default so normal
# networks fetch directly. Uses a neutral name (not HTTP_PROXY) so bun installs
# in child stages never inherit proxy env — bun breaks on the Docker Desktop
# proxy while apk requires it.
ARG BUILD_PROXY

FROM base AS deps
RUN for i in 1 2 3 4 5; do HTTP_PROXY="${BUILD_PROXY:-}" HTTPS_PROXY="${BUILD_PROXY:-}" apk add --no-cache libc6-compat && break || sleep 3; done && apk info -e libc6-compat

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

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock

COPY packages/ packages/
COPY apps/erp-shell/ apps/erp-shell/

ARG NEXT_PUBLIC_BILLING_APP_URL=http://billing.erp.local
ARG NEXT_PUBLIC_CRM_APP_URL=http://crm.erp.local
ARG NEXT_PUBLIC_INVENTORY_APP_URL=http://inventory.erp.local
ARG NEXT_PUBLIC_BASE_PATH=""
ARG NEXT_PUBLIC_DEPLOY_MODE="subdomain"
ENV NEXT_PUBLIC_BILLING_APP_URL=$NEXT_PUBLIC_BILLING_APP_URL \
    NEXT_PUBLIC_CRM_APP_URL=$NEXT_PUBLIC_CRM_APP_URL \
    NEXT_PUBLIC_INVENTORY_APP_URL=$NEXT_PUBLIC_INVENTORY_APP_URL \
    NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_PUBLIC_DEPLOY_MODE=$NEXT_PUBLIC_DEPLOY_MODE

RUN --mount=type=cache,target=/app/apps/erp-shell/.next/cache \
    mkdir -p apps/erp-shell/public && cd apps/erp-shell && bun run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

ARG BUILD_PROXY

RUN for i in 1 2 3 4 5; do HTTP_PROXY="${BUILD_PROXY:-}" HTTPS_PROXY="${BUILD_PROXY:-}" apk add --no-cache dumb-init && break || sleep 3; done && apk info -e dumb-init

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/erp-shell/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/erp-shell/.next/static ./apps/erp-shell/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/erp-shell/public ./apps/erp-shell/public

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/erp-shell/server.js"]
