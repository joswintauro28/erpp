# billing-ui — Billing Workstation Frontend

The Billing Workstation is a standalone Next.js 16 application configured on **port 3002** for Accountant and Auditor roles, providing focused access to invoicing workflows, GST accounting logs, quotients, and payment status tracking.

---

## 1. Tech Stack
- **Framework**: Next.js 16.2.10 (Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (inheriting `@datavex/ui-theme` tokens)
- **Shared Primitives**: `@datavex/ui-theme` components
- **Shared Middleware**: `@datavex/auth-middleware` API integrations

---

## 2. Workstation Ingress & SSO
- **Zero Credentials**: Does not implement login credentials or registration handlers locally.
- **SSO Capture**: Checks for `?token=<jwt>` URL query inputs on mount (or HttpOnly browser cookies).
- **Security Boundaries**: Redirects to `http://app.erp.local/login?redirect=http://billing.erp.local` (or `http://localhost:3000` locally) if no active session token is identified.

---

## 3. Proxy Configurations
The Next.js proxy middleware (`proxy.ts`) splits incoming requests:
- `/api/auth/*` &rarr; `core-iam` (Port 8002)
- All other `/api/*` &rarr; `billing-service` (Port 8003)

---

## 4. Workstation Routes
- `/dashboard`: KPI analytics (overdue trackers, outstanding balances, GST summaries)
- `/billing/invoices`: Main invoices ledger with detail popups and GST CGST/SGST/IGST breakdowns
- `/billing/quotations`: Customer quotations manager
- `/billing/payments`: Invoice payment records
- `/billing/credit-notes`: Invoices credit note adjusters
- `/billing/debit-notes`: Invoices debit note adjusters
- `/billing/recurring-invoices`: Schedules templates frequency badges

---

## 5. Development Scripts
- Developer Mode: `bun nx serve billing-ui` (runs on `http://localhost:3002`)
- Production Compile: `bun next build` (compiles optimized Next.js standalone server targets)
