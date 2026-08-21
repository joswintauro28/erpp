# DATAVEX ERP — Inventory Workstation (`apps/inventory-ui`) Agent Context

This directory contains the Inventory Workstation UI for Inventory Managers.

## 1. Tech Stack
- **Framework:** Next.js 16 (Turbopack)
- **Language:** TypeScript
- **Port:** 3004
- **Styling:** Tailwind CSS v4 (theme tokens configured via `@theme` directives in `@datavex/ui-theme/globals.css`)
- **Icons:** `lucide-react`
- **Charts:** `recharts`
- **Theme Shares:** Consumes `@datavex/ui-theme` components and theme.

## 2. Authentication & Auth Pattern
- **Token-verification only:** No local login page or credential handling.
- **SSO Intake:** On mount, verifies `?token=<jwt>` from the URL (provided by erp-shell), or fetches `/api/auth/refresh` from HttpOnly cookies.
- **Fallback Redirect:** If no authentication is active, redirects to:
  `http://localhost:3000/login?redirect=http://localhost:3004`
- **Auth context (`useAuth`):** Returns `{ user, isAuthenticated, loading, logout }`.

## 3. Proxy Routing (`proxy.ts`)
- `/api/auth/*` → core-iam (8002)
- All other `/api/*` → inventory-service (8004)

## 4. Routes (12 Total)
- `/dashboard`: `GET /api/dashboard/inventory` — aggregated KPIs (products, warehouses, stock, low stock, pending POs).
- `/products`: `GET /api/products` — product catalog with search, category badges.
- `/warehouses`: `GET /api/warehouses` — warehouse locations with status.
- `/stock`: `GET /api/stock` — stock levels per product/warehouse with availability.
- `/stock/movements`: `GET /api/stock/movements` — movement log with type badges (in/out/adjustment).
- `/suppliers`: `GET /api/suppliers` — supplier list with contact info.
- `/purchase-requisitions`: `GET /api/purchase-requisitions` — purchase requisition buy requests with status badges.
- `/purchase-orders`: `GET /api/purchase-orders` — purchase order list with status badges.
- `/serial-numbers`: `GET /api/serial-numbers` — serial tracking list with status filter.
- `/quality-checks`: `GET /api/quality-checks` — quality inspection logs and status chips.
- `/fulfillment`: `GET /api/fulfillment/orders` — sales order fulfillment pipeline Kanban.
- `/work-orders`: `GET /api/work-orders` — manufacturing production run routing and issues.

## 5. Development Commands
Run the development server for Inventory UI:
```bash
bun nx serve inventory-ui
```
