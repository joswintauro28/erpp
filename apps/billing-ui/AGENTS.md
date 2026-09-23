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
- **Token-verification & Session Persistence:** No local login page or credential handling.
- **SSO Intake & Reload Protection:** On mount, verifies `?token=<jwt>` from URL (provided by erp-shell), restores stored tokens via `getAccessToken()` on browser reload (**Ctrl + R**), or fetches `/api/auth/refresh` from HttpOnly cookies.
- **Fallback Redirect:** If no authentication is active, redirects to:
  `http://localhost:3000/login?redirect=http://localhost:3002`
- **Auth context (`useAuth`):** Returns `{ user, isAuthenticated, loading, logout }`.

## 3. Proxy Routing (`proxy.ts`)
- `/api/auth/*` → core-iam (`http://localhost:8002`)
- `/api/ai/*` → ai-service (`http://localhost:8005`, preserves `/api` prefix)
- `/api/files/*` → erp-service (`http://localhost:8000`, preserves `/api` prefix)
- `/api/settings*` → erp-service (`http://localhost:8000`, no `/api` prefix)
- `/api/notifications*` → erp-service (`http://localhost:8000`, no `/api` prefix)
- All other `/api/*` → billing-service (`http://localhost:8003`)

## 4. Sidebar Navigation
- **Pattern:** Hierarchical `sections` within groups, matching erp-shell's canonical sidebar design.
- **Types:** Defined in `types/navigation.ts` — `NavItem`, `NavGroup`, `NavSection`, `NavChild`.
- **Active state:** Smart matching (excludes more specific routes).
- **Active child indicator:** Left border bar (`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-sidebar-primary`).
- **Sections:** Dashboard (standalone), Billing (Invoices, Quotations, Payments, Credit Notes, Debit Notes, Recurring), Accounting (Chart of Accounts, General Ledger, Expenses, Reports, Fiscal Periods, Dunning, Aging, Bank Reconciliation).

## 5. Shared Components Used
All pages use `PageHeader` from `@datavex/ui-theme` for consistent headers. Pages that previously used hand-rolled `<h1>` tags have been migrated:
- `/dashboard` — Dashboard with KPI cards
- `/invoices` — Invoice list with GST summary
- `/quotations` — Quotation list
- `/payments` — Payment list with daily/monthly KPIs
- `/credit-notes` — Credit note list
- `/debit-notes` — Debit note list
- `/recurring-invoices` — Recurring invoice schedules
- `/accounting/*` — All 8 accounting pages (Accounts, Ledger, Expenses, Reports, Periods, Dunning, Aging, Reconciliation)

## 6. Routes
Note: with `NEXT_PUBLIC_BASE_PATH=/billing` in single-domain mode, browser URLs appear as `/billing/invoices`. App router paths (below) are relative to that basePath.

- `/dashboard`: `GET /api/dashboard/billing` — aggregated KPIs.
- `/invoices`: `GET /api/invoices` — invoice list.
- `/invoices/[id]`: `GET /api/invoices/:id` — invoice details, line items, and GST breakdown.
- `/quotations`: `GET /api/invoices/quotations` — quotation list.
- `/payments`: `GET /api/payments` — payment list with KPIs.
- `/credit-notes`: `GET /api/invoices/credit-notes` — credit note list.
- `/debit-notes`: `GET /api/invoices/debit-notes` — debit note list.
- `/recurring-invoices`: `GET /api/invoices/recurring` — recurring invoice schedules.

## 7. Development Commands
Run the development server for Billing UI:
```bash
bun nx serve billing-ui
```
