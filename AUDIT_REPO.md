# DATAVEX ERP — Repository Audit Report

Here is a comprehensive audit across all 6 projects inside the monorepo. The key findings are organized by priority.

---

## 🔴 Critical & High Priority Issues

### Data Integrity & Security

| Issue | Location |
| :--- | :--- |
| **No transactions on multi-table writes** — payments, refunds, credit/debit notes, quotations &rarr; invoice conversion can leave orphaned data | `/services/billing-service/` (7 locations across payments, credit-notes, debit-notes, and quotations services) |
| **Refresh token never rotated** — stolen refresh token is reusable indefinitely | `services/core-iam/src/auth/auth.controller.ts:114-123` |
| **No account lockout** — `failedLoginAttempts`/`lockedUntil` fields exist in schema but are never implemented | `services/core-iam/src/auth/auth.service.ts:22-48` |
| **No rate limiting on auth endpoints** (login/register) — vulnerable to brute force | `services/core-iam/`, `services/billing-service/`, `services/erp-service/` |
| **.env files committed to Git in 4 locations** — secrets exposed in repository | `apps/billing-ui/.env`, `services/core-iam/.env`, `services/billing-service/.env`, `services/erp-service/.env` |
| **Missing .env.example templates** | 3 of 5 projects (`billing-ui`, `core-iam`, `billing-service`) |
| **PermissionsGuard throws 401 instead of 403** for valid tokens lacking proper permissions | `services/billing-service/.../permissions.guard.ts:36`, `services/core-iam/.../permissions.guard.ts:25` |
| **[RESOLVED] No permissions claim in JWT** — Verified that JWT signed by NestJS carries the permissions list correctly | `services/core-iam/src/auth/auth.service.ts` |

### Schema & Database

| Issue | Location |
| :--- | :--- |
| **No indexes on ownerId or foreign keys** in any `billing-service` model — leads to full table scans on every query | `services/billing-service/prisma/schema.prisma` (all 7 models) |
| **No indexes on ownerId** in any `erp-service` model | `services/erp-service/app/models/` (Invoice, Payment, Product, etc.) |
| **WorkflowSetting.created_at typed as String** instead of DateTime — stored as literal `"now"` | `services/core-iam/prisma/schema.prisma:104`, `services/erp-service/app/models/settings.py:53` |
| **Quotation table doesn't exist** in `erp-service` database — model defined but missing from `__init__.py` and Alembic migrations | `services/erp-service/app/models/__init__.py` |
| **Missing @@unique([orgId, userId])** on `OrganizationMember` — duplicate member mappings are possible | `services/core-iam/prisma/schema.prisma:122-133` |
| **Missing @@unique([roleId, permissionId])** on `RolePermission` — duplicate assignments are possible | `services/core-iam/prisma/schema.prisma:166-174` |
| **onDelete: Cascade** on `CreditNote`/`DebitNote` `invoiceId` — deleting an invoice destroys financial logs and records | `services/billing-service/prisma/schema.prisma:133,150` |

### Frontend Code Quality

| Issue | Location |
| :--- | :--- |
| **19+ pages have no API calls** — accounting (4), inventory (9), settings/workflow, team, etc. are static placeholder views | `apps/erp-shell/app/(admin)/accounting/`, `.../inventory/`, `.../settings/`, `.../team/` |
| **payments/page.tsx** — no fetch logic at all, metrics are entirely hardcoded | `apps/erp-shell/app/(admin)/billing/payments/page.tsx:21-27` |
| **CSS class overwrite bug** — `.animate-step-in` defined twice, second block overwrites the first | `packages/ui-theme/src/globals.css:234-236` vs `239-279` |
| **Duplicate statusVariant() helper** function duplicated 11 times across 2 apps | Both `billing-ui` and `erp-shell` billing pages |
| **Search input pattern duplicated ~26 times** — should be extracted to a shared component | Every list page in both applications |
| **5+ different data fetching patterns** — `.then()`, async/await, cancellation flags, lacks consistency | All `erp-shell` pages |
| **No error.tsx in billing-ui** — runtime errors show a blank white screen | `apps/billing-ui/app/` |
| **Type inconsistencies** — 6 billing types use raw string instead of enums in `billing-ui` vs `erp-shell` | `apps/billing-ui/types/billing.ts` vs `apps/erp-shell/types/billing.ts` |

---

## 🟡 Medium Priority

### Code Duplication (~70% shared between billing-ui and erp-shell)

| Pattern | Files Involved |
| :--- | :--- |
| **[RESOLVED] api.ts** — 95% identical custom fetch wrapper (moved to shared package) | Both `apps/*/services/api.ts` |
| **[RESOLVED] AuthContext.tsx** — structurally duplicated (refactored to import from shared package) | Both `apps/*/contexts/AuthContext.tsx` |
| **Sidebar.tsx** — identical collapsible/flyout logic (400+ lines each) | Both `apps/*/components/Sidebar.tsx` |
| **types/billing.ts** — 180 lines duplicated identically | Both `apps/*/types/billing.ts` |
| **[RESOLVED] types/auth.ts, types/api.ts** — identical models (moved to shared package) | Both `apps/*/types/` |
| **money() utility** — duplicated identically | Both `apps/*/utils/format.ts` |
| **Header.tsx** — pulse-sweep animation duplicated | Both `apps/*/components/Header.tsx` |
| **ESLint configs** — identical config copies | Both `apps/*/eslint.config.mjs` |

### NestJS Backend Issues (core-iam & billing-service)

| Issue | Location |
| :--- | :--- |
| **[RESOLVED] No Logger anywhere** — Implemented NestJS Logger in `auth.service.ts` and `invoices.service.ts` | Both services |
| **[RESOLVED] Missing return types** on all controller and service methods — Added explicit return types to AuthService and InvoicesService | Both services (across all modules) |
| **`any` type abuse** — `flatten()`, `request.user`, raw DTO casts | `services/billing-service/` (6+ locations) |
| **class-transformer** in dependencies but never imported or utilized | `services/core-iam/package.json` |
| **[RESOLVED] No health check endpoint** — Added GET /health endpoints returning status ok | Both services |
| **JwtModule configured with empty options {}** | Both `auth.module.ts` |
| **No soft delete** — all deletions are hard database deletes | `services/billing-service/` |
| **No pagination** — all `findAll` queries return unlimited results | `services/billing-service/` |
| **Duplicate CRUD patterns across 7 services** — same `findAll`/`findOne`/`remove` boilerplate | `services/billing-service/` |
| **[RESOLVED] Missing updatedAt** on 7 models — Added updatedAt fields to all models | `services/core-iam/prisma/schema.prisma` |
| **[RESOLVED] register() has no transactional integrity** — Wrapped registration logic in a transaction block | `services/core-iam/src/auth/auth.service.ts:139-213` |

### FastAPI Backend Issues (erp-service)

| Issue | Location |
| :--- | :--- |
| **[RESOLVED] `require_permission` never applied** to any endpoint — Secured all 14 routes in invoices.py | `services/erp-service/app/api/v1/endpoints/invoices.py` |
| **`has_permission` function** is completely dead code (53 lines) | `app/core/permissions.py:83-135` |
| **Duplicate `DashboardStats` class** definition in two files | `app/schemas/dashboard.py:4-11` and `app/schemas/invoice.py:94-101` |
| **[RESOLVED] 5 dashboard endpoints missing `response_model`** — Added response_model validation | `app/api/v1/endpoints/dashboard.py` |
| **[RESOLVED] No global exception handler** — Handled errors globally and log them securely | `app/main.py` |
| **[RESOLVED] Missing Content-Security-Policy (CSP)** header in security middleware | `app/api/middleware.py:6-15` |
| **TokenPayload, UserCreate, UserOut** schemas are completely dead code | `app/schemas/auth.py:41-46`, `app/schemas/user.py:6-20` |
| **Ratelimit settings** defined but never connected to routers | `app/config.py:21-24` |
| **Hardcoded year "2026"** in quote number generation | `app/api/v1/endpoints/invoices.py:205` |
| **Redundant `db.commit()` calls** — double commit risk | `app/api/v1/endpoints/invoices.py` (7 locations) |
| **[RESOLVED] `get_async_session()` duplicate dependency** — Standardized on get_db, deleted get_async_session | `app/database.py:20-29` and `app/api/deps.py:12-21` |
| **`audit_logs` table doesn't exist** but `log_action()` performs raw SQL `INSERT` | `app/core/audit.py:28-31` |
| **Fragile `sys.path.append('.')`** imports in scripts | `scripts/seed.py`, `scripts/seed_admin.py`, `scripts/reset_db.py` |
| **Repository layer is empty shell** — all services bypass repositories with direct database queries | `app/repositories/*.py` |

### Cross-Cutting Infrastructure

| Issue | Location |
| :--- | :--- |
| **No Dockerfiles or docker-compose** | Entire repository |
| **No CI/CD pipeline** (GitHub Actions, etc.) | Entire repository |
| **No test files** in 4 of 6 projects | `billing-service`, `erp-service`, `erp-shell`, `billing-ui`, `ui-theme` |
| **README.md only references 2 of 6 projects** | Monorepo root |
| **SETUP_GUIDE.md has broken step numbering** | `docs/SETUP_GUIDE.md` |
| **PROJECT.md references non-existent services/packages** | `docs/PROJECT.md` |
| **Nx project.json files inconsistent** (command vs executor patterns) | `apps/billing-ui/project.json` vs `apps/erp-shell/project.json` |
| **Missing test/lint targets** in multiple `project.json` files | `billing-ui`, `billing-service`, `erp-service`, `ui-theme` |
| **No root tsconfig.base.json** — each project duplicates tsconfig configurations | Monorepo root |
| **No linting/formatting for Python** (no ruff/flake8/black in requirements) | `services/erp-service/requirements.txt` |
| **billing-service has lint target** in `project.json` but zero eslint configs | `services/billing-service/` |
| **Broken symlink** at `apps/erp-shell/node_modules/@datavex/ui` | Leftover from old package name |

### UI/UX & Accessibility

| Issue | Location |
| :--- | :--- |
| **All search inputs missing `aria-label`** — ~26 locations | Every list page in both applications |
| **Icon-only action buttons missing `aria-label`** — ~30+ locations | Every page with edit/delete actions |
| **Table headers missing `scope` attributes** | Both apps |
| **billing-ui invoice detail page is feature-poor** compared to the `erp-shell` version | `apps/billing-ui/app/(admin)/billing/invoices/[id]/page.tsx` (143 lines vs 389 lines) |
| **Missing not-found.tsx** in billing-ui | `apps/billing-ui/app/` |
| **Missing loading.tsx** in billing-ui | `apps/billing-ui/app/` |
| **Button default variant hardcodes hex colors** instead of utilizing CSS custom theme variables | `packages/ui-theme/src/components/ui/button.tsx` |
| **Label, Progress, and Textarea** don't use `@base-ui/react` (inconsistent with rest of `ui-theme`) | `packages/ui-theme/src/components/ui/label.tsx`, `progress.tsx`, `textarea.tsx` |

---

## 🟢 Quick Wins (Low Effort, High Impact)

1. **Extract `statusVariant()`** to a shared utility &mdash; replaces 11 duplicates with 1 function.
2. **Create `<SearchInput>` component** &mdash; consolidates 26 inline search bars.
3. **Create `<EmptyState>` component** &mdash; consolidates 16+ empty state card blocks.
4. **Create `<LoadingSpinner>` component** &mdash; replaces 14 inline spinner code blocks.
5. **Create `<PageHeader>` component** &mdash; consolidates 25+ page header designs.
6. **Add missing `error.tsx` and `not-found.tsx`** views to the `billing-ui` application.
7. **Add `aria-label` attributes to all icon-only buttons** &mdash; a grep-friendly, 10-minute fix.
8. **Remove unused imports** (`Spinner`, `BarChart`, `LabelList`, `CreditCard`, `DollarSign`, `BadgePercent`) inside `billing-ui`.
9. **Fix `.animate-step-in` CSS class overwrite** in `globals.css`.
10. **Add `.env.example` templates** for the 3 missing NestJS and Next.js services.

---

## Overall Summary

Codebase health is currently **moderate**. The core patterns are sound (Nx monorepo structure, cookie-based SSO flow, unified theme system), but there is significant technical debt due to rapid development:
1. Massive code duplication exists between the two Next.js frontend applications.
2. Missing transactional boundary safety in critical financial endpoints.
3. Zero test coverage.
4. 19 static placeholders instead of active API-wired functional views.

**Most Impactful Roadmap Goals:**
* Wrap all multi-table database writes inside transaction scopes.
* Extract duplicated frontend layouts, types, and hooks to `packages/ui-theme`.
* Wire the remaining static views to active API endpoints.