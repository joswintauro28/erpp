<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# billing-ui — Billing Workstation Frontend

## Overview
Standalone Next.js 16 application on **port 3002** for Accountant/Auditor roles. Provides a billing-focused dashboard and management interface for invoices, quotations, payments, credit/debit notes, and recurring invoices.

## Tech Stack
- **Framework**: Next.js 16.2.10 (Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (theme via `@datavex/ui-theme/globals.css`)
- **UI Library**: `@datavex/ui-theme` (11 shadcn components: badge, button, card, dialog, input, label, progress, select, spinner, table, textarea)
- **Icons**: lucide-react
- **Charts**: recharts

## Authentication
- **Token-verification only** — no login page, no credential handling.
- On mount: checks `?token=<jwt>` URL param (from erp-shell redirect), or tries `/api/auth/refresh` via cookie.
- No token found → redirects to `http://localhost:3000/login?redirect=<current_url>`.
- `useAuth()` provides: `{ user, isAuthenticated, loading, logout }` — no `login()` function.
- Logout: calls `/api/auth/logout`, clears token, redirects to erp-shell login.

## Proxy Routing
`proxy.ts` middleware intercepts `/api/:path*`:
- `/api/auth/*` → core-iam (port 8002, preserves `/api` prefix)
- All other `/api/*` → billing-service (port 8003, preserves `/api` prefix)

## Routes (9 total)
| Route | API Call | Description |
|-------|----------|-------------|
| `/dashboard` | `GET /api/dashboard/billing` | KPIs: revenue, outstanding, overdue, payment metrics, trends |
| `/billing/invoices` | `GET /api/invoices` | List with GST cards, search, status filter |
| `/billing/invoices/[id]` | `GET /api/invoices/:id` | Detail with items, GST breakdown, payments |
| `/billing/quotations` | `GET /api/invoices/quotations` | List with status filter |
| `/billing/payments` | `GET /api/payments` + `GET /api/payments/metrics` | List with KPI grid |
| `/billing/credit-notes` | `GET /api/invoices/credit-notes` | List |
| `/billing/debit-notes` | `GET /api/invoices/debit-notes` | List |
| `/billing/recurring-invoices` | `GET /api/invoices/recurring` | List with frequency badges |

## Theme
Same "Refined Crimson & Brushed Gold" as erp-shell — Deep Maroon chassis (`#3D1013`), Crimson Red brand (`#8C1D24`), Milled Brass gold accents (`#E5B83C`). All tokens inherited from `@datavex/ui-theme`.

## Sidebar
Collapsible (260px expanded / 64px collapsed) with billing-specific nav:
- Dashboard (standalone link)
- Billing group (Invoices, Quotations, Payments, Credit Notes, Debit Notes, Recurring)
- User footer with initials, name, role, and logout button

## Commands
- Dev: `bun nx serve billing-ui` or `cd apps/billing-ui && bun next dev --port 3002`
- Build: `cd apps/billing-ui && bunx next build`
