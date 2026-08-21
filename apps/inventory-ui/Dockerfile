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
RUN HTTP_PROXY="${BUILD_PROXY:-}" HTTPS_PROXY="${BUILD_PROXY:-}" apk add --no-cache libc6-compat

COPY package.json bun.lock nx.json ./
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

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock

COPY packages/ packages/
COPY apps/inventory-ui/ apps/inventory-ui/

ARG NEXT_PUBLIC_SHELL_APP_URL=http://app.erp.local
ARG NEXT_PUBLIC_APP_URL=http://inventory.erp.local
ENV NEXT_PUBLIC_SHELL_APP_URL=$NEXT_PUBLIC_SHELL_APP_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN --mount=type=cache,target=/app/apps/inventory-ui/.next/cache \
    mkdir -p apps/inventory-ui/public && cd apps/inventory-ui && bun run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3004 \
    HOSTNAME="0.0.0.0"

ARG BUILD_PROXY

RUN HTTP_PROXY="${BUILD_PROXY:-}" HTTPS_PROXY="${BUILD_PROXY:-}" apk add --no-cache dumb-init

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/inventory-ui/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/inventory-ui/.next/static ./apps/inventory-ui/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/inventory-ui/public ./apps/inventory-ui/public

USER nextjs
EXPOSE 3004

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/inventory-ui/server.js"]
