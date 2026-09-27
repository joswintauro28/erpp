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
- **Org Switcher (multi-tenancy):** `components/Header.tsx` embeds the shared `OrgSwitcher` from `@datavex/ui-theme`, which lists `user.organizations[]` and swaps tenants via `POST /api/auth/organizations/:id/switch` (new access token → data and per-org branding refetch).

## 3. Proxy Routing (`proxy.ts`)
- `/api/auth/*` → core-iam (`http://localhost:8002`)
- `/api/ai/*` → ai-service (`http://localhost:8005`, preserves `/api` prefix)
- `/api/files/*` → erp-service (`http://localhost:8000`, preserves `/api` prefix)
- `/api/settings*` and `/api/notifications*` → erp-service (`http://localhost:8000`, no `/api` prefix)
- All other `/api/*` → inventory-service (`http://localhost:8004`)

## 4. Sidebar Navigation
- **Pattern:** Hierarchical `sections` within groups, matching erp-shell's canonical sidebar design.
- **Types:** Defined in `types/navigation.ts` — `NavItem`, `NavGroup`, `NavSection`, `NavChild`.
- **Active state:** Smart matching (excludes more specific routes).
- **Active child indicator:** Left border bar (`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-sidebar-primary`).
- **Sections:** Dashboard (standalone), Inventory Management (Fulfillment, Products, Stock Levels, Stock Movements, Serial Numbers, Quality Checks), Procurement (Suppliers, Purchase Requisitions, Purchase Orders), Manufacturing (Work Orders), Locations (Warehouses).

## 5. Shared Components Used
All pages use `PageHeader` from `@datavex/ui-theme` for consistent headers. Pages that previously used hand-rolled `<h1>` tags have been migrated:
- `/dashboard` — Dashboard with KPI cards
- `/products` — Product catalog
- `/warehouses` — Warehouse locations
- `/stock` — Stock levels with adjust action
- `/stock/movements` — Movement log
- `/suppliers` — Supplier list
- `/purchase-orders` — Purchase order list
- `/purchase-requisitions` — Purchase requisition list
- `/serial-numbers` — Serial tracking list
- `/quality-checks` — Quality inspection logs
- `/fulfillment` — Sales order fulfillment Kanban
- `/work-orders` — Manufacturing production runs

## 6. Routes (12 Total)
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

## 7. Development Commands
Run the development server for Inventory UI:
```bash
bun nx serve inventory-ui
```
