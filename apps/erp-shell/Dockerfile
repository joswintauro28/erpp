FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=oven/bun:1.2-alpine /usr/local/bin/bun /usr/local/bin/bun

COPY package.json bun.lock nx.json ./
# Copy all workspace package.json files so Bun resolves the full dependency graph
COPY apps/erp-shell/package.json apps/erp-shell/
COPY apps/crm-shell/package.json apps/crm-shell/
COPY apps/billing-ui/package.json apps/billing-ui/
COPY apps/inventory-ui/package.json apps/inventory-ui/
COPY services/core-iam/package.json services/core-iam/
COPY services/billing-service/package.json services/billing-service/
COPY packages/auth-middleware/package.json packages/auth-middleware/
COPY packages/ui-theme/package.json packages/ui-theme/
RUN --mount=type=cache,target=/root/.cache/bun,sharing=shared \
    bun install --frozen-lockfile --ignore-scripts

COPY packages/ packages/
COPY apps/erp-shell/ apps/erp-shell/

ARG NEXT_PUBLIC_BILLING_APP_URL=http://billing.erp.local
ARG NEXT_PUBLIC_CRM_APP_URL=http://crm.erp.local
ARG NEXT_PUBLIC_INVENTORY_APP_URL=http://inventory.erp.local
ENV NEXT_PUBLIC_BILLING_APP_URL=$NEXT_PUBLIC_BILLING_APP_URL \
    NEXT_PUBLIC_CRM_APP_URL=$NEXT_PUBLIC_CRM_APP_URL \
    NEXT_PUBLIC_INVENTORY_APP_URL=$NEXT_PUBLIC_INVENTORY_APP_URL \
    NEXT_STANDALONE=true

RUN mkdir -p apps/erp-shell/public && cd apps/erp-shell && bun run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone files (minimal footprint)
COPY --from=builder --chown=nextjs:nodejs /app/apps/erp-shell/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/erp-shell/public ./apps/erp-shell/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/erp-shell/.next/static ./apps/erp-shell/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/erp-shell/server.js"]

