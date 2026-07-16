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
ARG NEXT_PUBLIC_BILLING_APP_URL=http://billing.erp.local
ARG NEXT_PUBLIC_CRM_APP_URL=http://crm.erp.local
ARG NEXT_PUBLIC_INVENTORY_APP_URL=http://inventory.erp.local
ENV NEXT_PUBLIC_BILLING_APP_URL=$NEXT_PUBLIC_BILLING_APP_URL
ENV NEXT_PUBLIC_CRM_APP_URL=$NEXT_PUBLIC_CRM_APP_URL
ENV NEXT_PUBLIC_INVENTORY_APP_URL=$NEXT_PUBLIC_INVENTORY_APP_URL
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/bun.lock ./
COPY packages ./packages
COPY apps/erp-shell ./apps/erp-shell
RUN cd apps/erp-shell && bun run build

FROM node:24.2.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/erp-shell/.next ./.next
COPY --from=builder /app/apps/erp-shell/public ./public
COPY --from=builder /app/apps/erp-shell/package.json ./package.json
COPY --from=builder /app/apps/erp-shell/next.config.ts ./next.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "node_modules/.bin/next", "start"]
