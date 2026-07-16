# crm-shell — CRM Workstation Frontend

The CRM Workstation is a modular Next.js 16 application configured on **port 3001** for Sales Executive roles, providing dedicated sales pipeline trackers, lead ingestion, and client analytics dashboards.

---

## 1. Tech Stack
- **Framework**: Next.js 16.2.10 (Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (theme variables loaded from `@datavex/ui-theme/globals.css`)
- **Shared Primitives**: `@datavex/ui-theme` custom components
- **Shared Middleware**: `@datavex/auth-middleware` API utilities

---

## 2. SSO Authentication Flow
- **Token-Verification Only**: The workstation is fully decentralized and contains no login pages or credential fields.
- **SSO Capture**: On mount, the application checks for a `?token=<jwt>` URL query parameter (forwarded from the Executive Shell after successful authentication) or checks for HttpOnly cookies.
- **Redirect Boundaries**: If no token is detected, the workstation redirects the browser to `http://app.erp.local/login?redirect=http://crm.erp.local` (or `http://localhost:3000` under localhost development).

---

## 3. Proxy Configurations
The Next.js edge proxy (`proxy.ts`) dynamically routes request targets:
- `/api/auth/*` &rarr; `core-iam` (Port 8002)
- All other `/api/*` &rarr; `crm-service` (Port 8001)

---

## 4. Run Scripts
- Dev Server: `bun nx serve crm-shell` (runs on `http://localhost:3001`)
- Production Build: `bun next build` (builds Next.js standalone outputs inside the container)
