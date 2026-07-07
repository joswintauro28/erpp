# DATAVEX ERP — Global Project Context for AI Agents

This document is the unified context hub and source of truth for AI agents working in this repository. It defines the system architecture, directory topology, tech stacks, core patterns, design rules, and commands across both frontend and backend modules.

---

## 1. System Topology & Directory Structure

DATAVEX ERP is organized as an **Nx Polyglot Monorepo**. This isolates frontend, backend, and shared libraries while standardizing on **TypeScript** (frontend) and **Python** (backend) to maximize agent context-awareness.

```
DATAVEX/ERP/ (Root)
├── apps/                                  # FRONTEND APPLICATIONS
│   └── erp-shell/                         # Next.js 16 (Turbopack) — Main Executive / Super Admin Shell
│
├── services/                              # BACKEND MICROSERVICES
│   └── erp-service/                       # FastAPI (Asynchronous Python 3.12+) — Core API Gateway
│
├── packages/                              # CENTRAL SHAREABLE PACKAGES
│   └── ui-theme/                          # Shared Shadcn UI primitives, custom theme, and Tailwind v4 variables
│
├── docs/                                  # DOCUMENTATION AND ROADMAPS
│   ├── SETUP_GUIDE.md                     # Step-by-step workspace installation and configuration guide
│   ├── PROJECT.md                         # Zero-Trust JWT wildcard cookies, DB allotment strategy
│   └── FUTURE_PLAN.md                     # Workstation sandboxing, VM & Kubernetes scaling maps
│
├── nx.json                                # Nx build and caching configurations
├── package.json                           # Central workspace project registry
└── AGENTS.md                              # THIS FILE
```

---

## 2. Frontend Project Context (`apps/erp-shell`)

### Tech Stack
* **Framework:** Next.js 16.2.10 (Turbopack)
* **Language:** TypeScript
* **Styling:** Tailwind CSS v4 (no `tailwind.config` — all theme values defined via CSS custom properties and `@theme` directives in the global theme)
* **Icons:** `lucide-react`
* **Common Routing:** Proxies all `/api/*` endpoints directly to the backend at `http://127.0.0.1:8000/`.

### UI Theme: "Refined Crimson & Brushed Gold"
A premium, authoritative dark structural shell built with deep maroon chassis, crimson active states, and yellow-gold highlights.

| CSS Custom Variable | Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| `--sidebar` | `#4A1518` | Deep Maroon sidebar panel background |
| `--shell-header` | `#4A1518` | Deep Maroon header background |
| `--shell-brand` | `#8C1D24` | Crimson Red — buttons, active states, primary actions |
| `--shell-accent` | `#F1C423` | Yellow-Gold — badges, icon highlight fills, sweep pulse |
| `--sidebar-primary` | `#F1C423` | Gold — brand marks, active icons |
| `--sidebar-brand` | `#8C1D24` | Crimson Red — active item background tint |
| `--radius` | `4px` | Strict button corners |
| `--radius-xl` | `6px` | Tight card corner radius |

### Core Frontend Patterns
* **Authentication (`useAuth`):** AuthContext handles user authentication, token refresh, and login state. Session persistence uses `localStorage`. The returned user payload contains: `id, email, full_name, role, organization_name, permissions`.
* **API Service (`services/api.ts`):** Centralized fetch wrapper that appends JWT headers and handles automatic token refreshing upon receiving a `401 Unauthorized` response.
* **Imports & Path Aliases:** All Shadcn primitives (`button`, `card`, `dialog`, etc.) and the `cn` utility are imported from `@/components/ui/*` and `@/lib/utils`. In [tsconfig.json](apps/erp-shell/tsconfig.json), these paths are mapped directly to `@datavex/ui-theme` to keep application files clean:
  ```json
  "@/components/ui/*": ["../../packages/ui-theme/src/components/ui/*"],
  "@/lib/utils": ["../../packages/ui-theme/src/lib/utils.ts"]
  ```
* **Multi-Step Modals:** All forms (leads, clients, quotes, payments) use `components/multi-step-dialog.tsx`, displaying an horizontal step wizard with standard grid inputs (`gap-x-5` horizontal, `gap-y-4` vertical).

---

## 3. Backend Project Context (`services/erp-service`)

### Tech Stack
* **Framework:** FastAPI
* **Database Driver & ORM:** SQLAlchemy 2.0 (`AsyncSession` via `postgresql+asyncpg` driver)
* **Migrations:** Alembic
* **Authentication:** PyJWT (signs user details, sets HTTP-only secure session cookies)
* **Password Hashing:** Native `bcrypt`

### Core Backend Patterns
* **Controller-Service-Repository Pattern:**
  * **Routing (`app/api/v1/endpoints/`):** FastAPI paths validate payloads using Pydantic schemas.
  * **Services (`app/services/`):** Handle transactions, business validations, and call repositories.
  * **Repositories (`app/repositories/`):** Execute SQLAlchemy asynchronous queries.
* **Ownership Isolation:** All queries filter data dynamically based on the current user's `owner_id` context (`User.id`).
* **Auto-Migration Engine:** During startup, `main.py` checks metadata models and runs checks/alterations to sync missing columns dynamically.

---

## 4. Shared Packages (`packages/ui-theme`)

The theme package manages the central design system and UI components:
* **Tailwind CSS v4 Configuration:** The package defines `components.json` to handle Shadcn CLI setups.
* **Imports & Resolution:** In [tsconfig.json](packages/ui-theme/tsconfig.json), `baseUrl` and `@/*` mapping are defined pointing to `./src/*` so the Shadcn CLI can write components cleanly using relative path aliases inside the library.
* **Styles:** The core theme tokens are configured in [src/globals.css](packages/ui-theme/src/globals.css). Editors compile this cleanly as VS Code is configured to ignore custom at-rules (`@source`, `@theme`, etc.).

---

## 5. Development Workflows & Scripts

For database initialization, migrations, and running development environments, use the following commands from the root directory:

### Run Development Servers (Nx Monorepo)
* **Run Entire Monorepo:**
  ```bash
  bun nx run-many --target=dev
  ```
* **Run Frontend Only:**
  ```bash
  bun nx serve erp-shell
  ```
* **Run Backend Only:**
  ```bash
  bun nx run erp-service:dev
  ```

### Database Operations (Python Environment)
All backend database commands must be executed within `services/erp-service` with `PYTHONPATH` configured:

* **Apply Schema Migrations:**
  ```powershell
  $env:PYTHONPATH="."
  .venv\Scripts\alembic upgrade head
  ```
* **Wipe Database (Drop All Tables):**
  ```powershell
  $env:PYTHONPATH="."
  .venv\Scripts\python scripts/reset_db.py
  ```
* **Seed Workspace Database (All Users - 241 rows):**
  ```powershell
  $env:PYTHONPATH="."
  .venv\Scripts\python scripts/seed.py
  ```

---

## 6. Linked Documentation References

Before modifying core patterns, check these additional files:
1. **[docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md):** Step-by-step walkthrough on environment setup, local configurations, and active login accounts.
2. **[docs/PROJECT.md](docs/PROJECT.md):** SSO architecture, database allotment strategy, and Zero-Trust subdomains structure.
3. **[docs/FUTURE_PLAN.md](docs/FUTURE_PLAN.md):** Local sandboxing, VM deployment architectures (Caddy + RDS), and horizontal container scaling roadmaps.
4. **[apps/erp-shell/PROGRESS.md](apps/erp-shell/PROGRESS.md):** Status tracker for frontend routes, complete lists of pages, and specific design tokens.
