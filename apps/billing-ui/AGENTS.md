# DATAVEX ERP — Billing Workstation (`apps/billing-ui`) Agent Context

This directory contains the Billing Workstation UI for Accountants and Auditors.

## 1. Tech Stack
- **Framework:** Next.js 16 (Turbopack)
- **Language:** TypeScript
- **Port:** 3002
- **Styling:** Tailwind CSS v4 (theme tokens configured via `@theme` directives in `@datavex/ui-theme/globals.css`)
- **Icons:** `lucide-react`
- **Charts:** `recharts`
- **Theme Shares:** Consumes `@datavex/ui-theme` components and theme.

## 2. Authentication & Auth Pattern
- **Token-verification only:** No local login page or credential handling.
- **SSO Intake:** On mount, verifies `?token=<jwt>` from the URL (provided by erp-shell), or fetches `/api/auth/refresh` from HttpOnly cookies.
- **Fallback Redirect:** If no authentication is active, redirects to:
  `http://localhost:3000/login?redirect=http://localhost:3002`
- **Auth context (`useAuth`):** Returns `{ user, isAuthenticated, loading, logout }`.

## 3. Proxy Routing (`proxy.ts`)
- `/api/auth/*` → core-iam (8002)
- All other `/api/*` → billing-service (8003)

## 4. Routes (9 Total)
- `/dashboard`: `GET /api/dashboard/billing` — aggregated KPIs.
- `/billing/invoices`: `GET /api/invoices` — invoice list.
- `/billing/invoices/[id]`: `GET /api/invoices/:id` — invoice details, line items, and GST breakdown.
- `/billing/quotations`: `GET /api/invoices/quotations` — quotation list.
- `/billing/payments`: `GET /api/payments` — payment list with KPIs.
- `/billing/credit-notes`: `GET /api/invoices/credit-notes` — credit note list.
- `/billing/debit-notes`: `GET /api/invoices/debit-notes` — debit note list.
- `/billing/recurring-invoices`: `GET /api/invoices/recurring` — recurring invoice schedules.

## 5. Development Commands
Run the development server for Billing UI:
```bash
bun nx serve billing-ui
```
