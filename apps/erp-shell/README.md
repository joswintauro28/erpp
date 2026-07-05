# erp-shell — DATAVEX ERP Frontend

Next.js 16 (Turbopack) application with TypeScript, Tailwind CSS v4, and shadcn/ui.

## Stack

- **Framework**: Next.js 16.2.10 (Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (theme via CSS `@theme` directives)
- **UI Library**: shadcn/ui with custom "Refined Crimson & Brushed Gold" theme
- **Fonts**: Montserrat (headings), Inter (body), JetBrains Mono (code)
- **Icons**: lucide-react
- **Animations**: tailwindcss-animate, tw-animate-css

## Getting Started

```bash
bun run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

## Architecture

```
app/
├── layout.tsx              # Root: fonts, AuthProvider
├── globals.css             # Theme tokens, @theme, animations
├── (auth)/login/           # Login page
├── (admin)/
│   ├── layout.tsx          # Auth guard, Sidebar + Header
│   ├── loading.tsx         # Skeleton loading page
│   ├── dashboard/          # KPI cards, charts, procurement
│   ├── crm/leads/          # Lead pipeline (wired to API)
│   ├── crm/clients/        # Client list + detail (wired to API)
│   ├── billing/            # Invoices, payments, quotations, etc.
│   ├── accounting/         # Accounts, ledger, expenses, reports
│   ├── inventory/          # Products, stock, warehouses, etc.
│   └── settings/           # Settings, branding, workflow, team
├── not-found.tsx            # 404 page
├── forbidden/page.tsx       # 403 page
├── error.tsx                # 500 error page

components/
├── Sidebar.tsx              # Collapsible 240px/64px
├── Header.tsx               # 80px deep maroon header
├── multi-step-dialog.tsx    # Reusable step wizard dialog
└── ui/                      # shadcn/ui primitives

types/                       # Domain-organized TypeScript types
├── crm.ts, billing.ts, accounting.ts, inventory.ts
├── auth.ts, api.ts, dashboard.ts, ui.ts
├── notifications.ts, navigation.ts, settings.ts

services/
└── api.ts                   # Fetch wrapper with auto-refresh on 401

utils/
└── format.ts                # money(), searchLeads(), searchClients(), searchBilling()

contexts/
└── AuthContext.tsx           # Login/logout/refresh, provides User
```

## Theme

"Refined Crimson & Brushed Gold" — all tokens defined in `globals.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--sidebar` | `#4A1518` | Deep maroon sidebar chassis |
| `--shell-header` | `#4A1518` | Deep maroon header bg |
| `--shell-brand` | `#8C1D24` | Crimson red — buttons, primary actions |
| `--shell-accent` | `#F1C423` | Yellow-gold — badges, icon fills, pulse bar |
| `--radius` | `4px` | Buttons |
| `--radius-xl` | `6px` | Cards |

## Key Patterns

- **Auth**: `useAuth()` returns `{ user, isAuthenticated, loading, login, logout }`
- **API**: `api.get<T>(path)`, `api.post<T>(path, body)`, `api.put<T>(path, body)`, `api.delete<T>(path)` — auto-refresh on 401
- **Proxy**: `/api/*` routes forwarded to `http://127.0.0.1:8000`
- **Styling**: Use CSS custom properties via Tailwind (`bg-[--shell-brand]`, `text-[--shell-muted]`)
- **Forms**: Multi-step with `MultiStepDialog`, label→input `space-y-2`, field→field `space-y-5`

## Pages (33 routes)

| Route | Status |
|-------|--------|
| `/dashboard` | Wired to API (6 parallel calls) |
| `/crm/leads` | Wired to API (GET/POST/PUT/DELETE + convert) |
| `/crm/clients` | Wired to API |
| `/crm/clients/[id]` | Wired to API |
| `/billing/invoices` | Wired to API |
| `/billing/invoices/[id]` | Wired to API |
| `/billing/payments` | API-ready (empty state) |
| `/billing/quotations` | API-ready (empty state) |
| `/billing/recurring-invoices` | API-ready (empty state) |
| `/billing/credit-notes` | API-ready (empty state) |
| `/billing/debit-notes` | API-ready (empty state) |
| `/accounting/*` (4 routes) | API-ready (empty state) |
| `/inventory/*` (9 routes) | API-ready (empty state) |
| `/settings/*` (4 routes) | API-ready (empty state) |
| `/team` | API-ready (empty state) |

## Commands

```bash
bun run dev        # Development server
npx next build     # Production build
bun run lint       # Lint
```
