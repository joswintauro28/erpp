<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# erp-shell — Frontend Project Context

## Tech Stack
- **Framework**: Next.js 16.2.10 (Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (no tailwind.config.* — all theme via CSS `@theme` directives in globals.css)
- **UI Library**: shadcn/ui with "base-nova" style
- **Fonts**: Montserrat (headings), Inter (body), JetBrains Mono (code) — loaded via `next/font/google`
- **Icons**: lucide-react
- **Animations**: tailwindcss-animate, tw-animate-css

## Theme: "Refined Crimson & Brushed Gold"

| Token | Value | Usage |
|-------|-------|-------|
| `--sidebar` | `#4A1518` | Deep Maroon sidebar chassis |
| `--shell-header` | `#4A1518` | Deep Maroon header bg |
| `--shell-brand` | `#8C1D24` | Crimson Red — buttons, primary actions |
| `--shell-accent` | `#F1C423` | Yellow-Gold — badges, icon fills, pulse bar |
| `--shell-action` | `#8C1D24` | Crimson Red — interaction highlights |
| `--sidebar-primary` | `#F1C423` | Gold — sidebar brand, active icons |
| `--sidebar-brand` | `#8C1D24` | Crimson — sidebar active state backgrounds |
| `--radius` | `4px` | Engineered radius (buttons) |
| `--radius-xl` | `6px` | Card radius |

All colors defined as CSS custom properties in `app/globals.css` under `:root` and `.dark`.

## Architecture

```
app/
├── layout.tsx              # Root: font loading, AuthProvider wrapper
├── page.tsx                # Redirect / → /dashboard
├── globals.css             # All theme tokens, @theme, animations, @keyframes step-in
├── not-found.tsx           # 404 (brand theme)
├── error.tsx               # 500 (brand theme)
├── forbidden/page.tsx      # 403 (brand theme)
├── (auth)/
│   └── login/page.tsx
├── (admin)/
│   ├── layout.tsx          # Auth guard, Sidebar + Header wrapper
│   ├── loading.tsx         # Skeleton loading (brand bar, KPI cards, charts, table)
│   ├── dashboard/          # Wired to API (6 parallel calls)
│   ├── crm/leads/          # Wired to API (CRUD + convert)
│   ├── crm/clients/        # List + detail, wired to API
│   ├── billing/            # 7 routes (invoices list + detail wired; others API-ready)
│   ├── accounting/         # 4 routes (API-ready — empty state)
│   ├── inventory/          # 9 routes (API-ready — empty state)
│   └── settings/           # 4 routes (API-ready — empty state)

types/
├── crm.ts                  # Lead, Client, ApiClient, PortalAccess, LeadAnalytics
├── billing.ts              # ApiInvoice, InvoiceDetailView, ApiPayment, etc.
├── accounting.ts           # FinancialReport, BalanceSheetItem, etc.
├── inventory.ts            # Product, StockMovement, Warehouse, etc.
├── auth.ts                 # User, AuthState
├── dashboard.ts            # DashboardData
├── api.ts                  # ApiClientError, ApiError
├── ui.ts                   # StepConfig, MultiStepDialogProps
├── notifications.ts        # Notification
├── navigation.ts           # NavGroup, NavItem
└── settings.ts             # BrandingSettings, WorkflowRule, etc.

components/
├── Sidebar.tsx             # Collapsible 240px/64px, useAuth for user data
├── Header.tsx              # 80px deep maroon, useAuth for initials, notification bell
├── multi-step-dialog.tsx   # Reusable branded step wizard dialog
└── ui/                     # shadcn primitives (button, card, table, badge, textarea, etc.)

services/
└── api.ts                  # Re-exports from @datavex/auth-middleware

utils/
└── format.ts               # money(), searchLeads(), searchClients(), searchBilling()

contexts/
└── AuthContext.tsx          # Login/logout/refresh, localStorage persistence
```

## Key Patterns
- **Auth**: `useAuth()` returns `{ user, isAuthenticated, loading, login, logout }`
- **User shape**: `{ id, email, full_name, last_login, organization_id, organization_name, role, permissions }`
- **API**: `api.get<T>(path)`, `api.post<T>(path, body)`, `api.put<T>(path, body)`, `api.delete<T>(path)` — all with auto-refresh on 401. Imported from `@datavex/auth-middleware` via `services/api.ts`.
- **Navigation**: All admin routes prefixed with `/api/` proxy to `http://127.0.0.1:8000/`
- **Styling**: Use CSS custom properties (`--shell-*`, `--sidebar-*`) via Tailwind classes like `bg-sidebar`, `text-sidebar-primary`, `bg-[--shell-header]`
- **Radius**: Use `rounded-sm` (4px) for buttons, `rounded-xl` (6px) for cards
- **Logout**: `await logout(); router.push("/login");`
- **MultiStepDialog**: Reusable dialog with branded step indicator, `currentStep`/`onStepChange`/`steps`/`onSubmit`/`disableNext`/`submitLabel`/`isSubmitting` props. `isFirstStep`/`isLastStep` computed internally. Steps defined as `{ title: string; description: string }[]`.
- **Form spacing**: label→input `space-y-2` (8px canonical tight), field→field `space-y-5` (20px), grid fields `gap-x-5` (horizontal) / `gap-y-4` (vertical)
- **Import helpers**: from `@/utils/format` (not `@/lib/data` — that file no longer exists)
- **Page wiring pattern**: `useEffect` + `useState` + `api.get<T>()` on mount, cancellation flag for unmount safety, loading state renders spinner, error state renders null/empty
- **Auth persistence**: access token in `localStorage` (not `sessionStorage`)
- **Types**: Domain-organized in `types/` directory, not inline or in `lib/`

## Commands
- Dev: `bun run dev`
- Build: `npx next build`
- Backend: `.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload` (from `services/erp-service/`)

## Required Dependencies
- `"@datavex/auth-middleware": "workspace:*"` — must be listed in `package.json` dependencies (imported by `services/api.ts`, `contexts/AuthContext.tsx`, `types/auth.ts`, `types/api.ts`)
- `turbopack.root` configured in `next.config.ts` — required for workspace package resolution with Turbopack
