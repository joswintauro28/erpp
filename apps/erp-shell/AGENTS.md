# DATAVEX ERP — Executive Shell (`apps/erp-shell`) Agent Context

This directory contains the main Executive / Super Admin Shell of the DATAVEX ERP system.

## 1. Tech Stack
- **Framework:** Next.js 16.2.10 (Turbopack)
- **Language:** TypeScript
- **Port:** 3000
- **Styling:** Tailwind CSS v4 (theme tokens configured via `@theme` directives in `@datavex/ui-theme/globals.css`)
- **Icons:** `lucide-react`
- **Charts:** `recharts`
- **Theme Aesthetics:** "Refined Crimson & Brushed Gold"

## 2. Core Architecture & Patterns
- **Authentication (`useAuth`):** Handles centralized login status, token intake, and session persistence via `@datavex/auth-middleware`. User payload claims: `id, email, full_name, role, organization_name, permissions`.
- **SSO Redirection:**
  - Login page processes a `?redirect=...` query parameter to redirect the user back to the calling workstation domain.
  - Passes the authenticated token via `?token=<jwt>` to the target workstation on successful login.
  - Role-based routing forwards users as follows:
    - Accountant / Auditor → Billing (`http://localhost:3002`)
    - Sales Executive → CRM (`http://localhost:3001`)
    - Admins → Remain on erp-shell (`http://localhost:3000`)
- **API Service (`services/api.ts`):** Re-exports API clients from `@datavex/auth-middleware`.
- **Gateway Proxy (`proxy.ts` / Next.js middleware):**
  - `/api/auth/*` → core-iam (`http://localhost:8002`, preserving `/api` prefix)
  - `/api/ai/*` → ai-service (`http://localhost:8005`, preserving `/api` prefix)
  - `/api/files/*` → erp-service (`http://localhost:8000`, preserving `/api` prefix)
  - All other `/api/*` (products, warehouses, stock, suppliers, purchase-orders, purchase-requisitions, serial-numbers, quality-checks, fulfillment, work-orders, invoices, payments, CRM, dashboard) → erp-service (`http://localhost:8000`, stripping `/api` prefix) acting as the central API Gateway and Aggregator.

## 3. Dashboard Architecture
- **Route:** `/dashboard` — single pane of glass aggregating all services
- **Data sources (7 parallel fetches via `Promise.all`):**
  - `GET /api/dashboard/stats` → erp-service (8000) — aggregates billing, CRM, and inventory KPIs
  - `GET /api/dashboard/recent-invoices` → erp-service (8000) — latest 5 invoices
  - `GET /api/dashboard/revenue-trend` → erp-service (8000) — monthly revenue time series
  - `GET /api/dashboard/invoice-summary` → erp-service (8000) — invoice lifecycle breakdown
  - `GET /api/dashboard/payment-analytics` → erp-service (8000) — payment method breakdown
  - `GET /api/dashboard/client-growth` → erp-service (8000) — new clients per month
  - `GET /api/dashboard/crm` → erp-service (8000, proxied to crm-service 8001) — pipeline stages, AI recommendations
- **Local components:** `PipelineChart.tsx` (donut + stage breakdown), `Recommendations.tsx` (AI insights)
- **Charts:** AreaChart (revenue, clients), PieChart (invoices, pipeline), BarChart (payments, stages)
- **KPI row:** Revenue (MTD) | Outstanding | Invoices | Pipeline Value | Open Opportunities | Clients

## 4. Development Commands
Run the development server for this module:
```bash
bun nx serve erp-shell
```
