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
- **Token-verification & Session Persistence:** No local login page or credential handling.
- **SSO Intake & Reload Protection:** On mount, verifies `?token=<jwt>` from URL (provided by erp-shell), restores stored tokens via `getAccessToken()` on browser reload (**Ctrl + R**), or fetches `/api/auth/refresh` from HttpOnly cookies.
- **Fallback Redirect:** If no authentication is active, redirects to:
  `http://localhost:3000/login?redirect=http://localhost:3004`
- **Auth context (`useAuth`):** Returns `{ user, isAuthenticated, loading, logout }`.

## 3. Proxy Routing (`proxy.ts`)
- `/api/auth/*` → core-iam (`http://localhost:8002`)
- All other `/api/*` → inventory-service (`http://localhost:8004`)

## 4. Routes (8 Total)
- `/dashboard`: `GET /api/dashboard/inventory` — aggregated KPIs.
- `/inventory/products`: `GET /api/products` — product catalog.
- `/inventory/warehouses`: `GET /api/warehouses` — warehouse locations.
- `/inventory/stock`: `GET /api/stock` — stock levels.
- `/inventory/stock/movements`: `GET /api/stock/movements` — stock movement log.
- `/inventory/suppliers`: `GET /api/suppliers` — supplier list.
- `/inventory/purchase-orders`: `GET /api/purchase-orders` — purchase order list.
- `/inventory/serial-numbers`: `GET /api/serial-numbers` — serial tracking.

## 5. Development Commands
Run the development server for Inventory UI:
```bash
bun nx serve inventory-ui
```
