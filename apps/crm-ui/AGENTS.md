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
- **Token-verification only:** No local login page or credential handling.
- **SSO Intake:** On mount, verifies `?token=<jwt>` from the URL (provided by erp-shell), or fetches `/api/auth/refresh` from HttpOnly cookies.
- **Fallback Redirect:** If no authentication is active, redirects to:
  `http://localhost:3000/login?redirect=http://localhost:3001`
- **Auth context (`useAuth`):** Returns `{ user, isAuthenticated, loading, logout }` (does not have a local `login()` handler).

## 3. Proxy Routing (`proxy.ts`)
- `/api/auth/*` → core-iam (8002)
- All other `/api/*` → crm-service (8001)

## 4. Development Commands
Run the development server for CRM UI:
```bash
bun nx serve crm-ui
```
