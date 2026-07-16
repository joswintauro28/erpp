# inventory-ui — Inventory Workstation Frontend

The Inventory Workstation is a standalone Next.js 16 application configured on **port 3004** for Logistics and Inventory Manager roles, providing stock level monitoring, warehouse tracking, procurement managers, and serial tracking ledgers.

---

## 1. Tech Stack
- **Framework**: Next.js 16.2.10 (Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (inheriting `@datavex/ui-theme` tokens)
- **Shared Primitives**: `@datavex/ui-theme` components
- **Shared Middleware**: `@datavex/auth-middleware` API integrations

---

## 2. Ingress & SSO Auth
- **Session Capture**: On mount, checks URL parameters for `?token=<jwt>` or cookie parameters.
- **SSO Fallback**: Redirects to `http://app.erp.local/login?redirect=http://inventory.erp.local` (or `http://localhost:3000` in dev mode) if unauthorized.

---

## 3. Proxy Configurations
The Next.js edge proxy (`proxy.ts`) routes requests:
- `/api/auth/*` &rarr; `core-iam` (Port 8002)
- All other `/api/*` &rarr; `inventory-service` (Port 8004)

---

## 4. Workstation Routes
- `/dashboard`: Inventory KPIs (stock items, warehouse totals, low stock status flags, open purchase orders)
- `/inventory/products`: Unified product master catalogs
- `/inventory/warehouses`: Storage location metadata
- `/inventory/stock`: Products quantities per warehouse
- `/inventory/stock/movements`: Stock adjustments in/out logs
- `/inventory/suppliers`: Supplier vendor directory
- `/inventory/purchase-orders`: Procurement purchase order lifecycle
- `/inventory/serial-numbers`: Tracking lists for serial numbers

---

## 5. Development Scripts
- Developer Mode: `bun nx serve inventory-ui` (runs on `http://localhost:3004`)
- Production Compile: `bun next build` (compiles optimized Next.js standalone server targets)
