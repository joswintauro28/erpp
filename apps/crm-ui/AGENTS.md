# DATAVEX ERP — CRM Workstation (`apps/crm-ui`) Agent Context

This directory contains the CRM Workstation / Sales Hub of the DATAVEX ERP system.

## 1. Tech Stack
- **Framework:** Next.js 16 (Turbopack)
- **Language:** TypeScript
- **Port:** 3001
- **Styling:** Tailwind CSS v4 (theme tokens configured via `@theme` directives in `@datavex/ui-theme/globals.css`)
- **Icons:** `lucide-react`
- **Charts:** `recharts`
- **Theme Shares:** Consumes components and global theme variables from `@datavex/ui-theme`.

## 2. Authentication & Auth Pattern
- **Token-verification & Session Persistence:** No local login page or credential handling.
- **SSO Intake & Reload Protection:** On mount, verifies `?token=<jwt>` from URL (provided by erp-shell), restores stored tokens via `getAccessToken()` on browser reload (**Ctrl + R**), or fetches `/api/auth/refresh` from HttpOnly cookies.
- **Fallback Redirect:** If no authentication is active, redirects to:
  `http://localhost:3000/login?redirect=http://localhost:3001`
- **Auth context (`useAuth`):** Returns `{ user, isAuthenticated, loading, logout }` (does not have a local `login()` handler).
- **Org Switcher (multi-tenancy):** `components/Header.tsx` embeds the shared `OrgSwitcher` from `@datavex/ui-theme`, which lists `user.organizations[]` and swaps tenants via `POST /api/auth/organizations/:id/switch` (new access token → data and per-org branding refetch).

## 3. Proxy Routing (`proxy.ts`)
- `/api/auth/*` → core-iam (`http://localhost:8002`)
- `/api/ai/*` → ai-service (`http://localhost:8005`, preserves `/api` prefix)
- `/api/files/*` → erp-service (`http://localhost:8000`, preserves `/api` prefix)
- `/api/settings*` and `/api/notifications*` → erp-service (`http://localhost:8000`, no `/api` prefix)
- All other `/api/*` → crm-service (`http://localhost:8001`)

## 4. Document ID Contract
- IDs are generated server-side by crm-service (`[PREFIX]-[YYYYMM]-[NNNN]`, customers `CUST-NNNN`). **Never fabricate IDs client-side** (no `Date.now()...slice(-6)` patterns).
- Omit `id_str`, `so_no`, `quote_no` when creating records so the backend assigns them; `so_no`/`quote_no` may only be sent as user-entered canonical values (`SO-202608-0001` style).

## 5. Development Commands
Run the development server for CRM UI:
```bash
bun nx serve crm-ui
```
