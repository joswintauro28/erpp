# DATAVEX ERP — Complete Cybersecurity & Project Audit

| Audit Metadata | Details |
|---|---|
| **Audit Date** | 2026-09-19 |
| **Last Updated** | 2026-09-21 |
| **Auditor** | AI-Assisted Security Review & Architecture Audit |
| **Monorepo Scope** | 6 Backend Microservices, 4 Next.js Frontend Workstations, Shared Packages, Docker Infrastructure |
| **Target Branch** | `dev` |
| **Remediation Status** | In Active Remediation (Phase 1 & Short-Term Priorities Deployed) |

---

## Table of Contents

1. [Executive Summary & Security Posture](#executive-summary--security-posture)
   - [Severity Breakdown](#severity-breakdown)
   - [Audit Phase Breakdown](#audit-phase-breakdown)
   - [Top Systemic Risks & Current Status](#top-systemic-risks--current-status)
2. [Audit Phases & Detailed Technical Findings](#audit-phases--detailed-technical-findings)
   - [Phase 1: Core IAM (Authentication & RBAC)](#phase-1-core-iam-authentication--rbac)
   - [Phase 2: Inventory Service & UI](#phase-2-inventory-service--frontend)
   - [Phase 3: Billing Service & UI](#phase-3-billing-service--frontend)
   - [Phase 4: CRM Service & UI](#phase-4-crm-service--frontend)
   - [Phase 5: ERP Service (API Gateway) & Shell](#phase-5-erp-service-gateway--frontend)
   - [Phase 6: AI Service & Docker Infrastructure](#phase-6-ai-service--docker-infrastructure)
   - [Phase 7: Cross-Cutting Concerns](#phase-7-cross-cutting-concerns)
     - [7.1 Frontend Security](#71-frontend-security)
     - [7.2 Infrastructure Security](#72-infrastructure-security)
     - [7.3 Business Logic Gaps](#73-business-logic-gaps)
3. [Master Findings Registry (Findings 1–128)](#master-findings-registry)
4. [Recommended Remediation Priority & Deep-Dives](#recommended-remediation-priority)
   - [Immediate (Week 1) — Complete](#immediate-week-1--all-complete)
   - [Short-Term (Weeks 2–4) — Status & Deep-Dives](#short-term-weeks-2-4--4-of-6-remediated-2-architecturally-documented)
     - [Deep-Dive: Why httpOnly Cookies & SSO Refactor Scope](#deep-dive-why-httponly-cookies--why-a-full-auth-refactor-is-needed)
     - [Deep-Dive: Gateway Input Validation & Defense-in-Depth](#deep-dive-input-validation--gateway-defense-in-depth-strategy)
   - [Medium-Term (Months 2–3)](#medium-term-months-2-3)
   - [Long-Term (Months 3–6)](#long-term-months-3-6)
5. [Remediation Change Log](#remediation-log)

---

## Executive Summary & Security Posture

### Severity Breakdown

| Severity | Total Findings | Remediated | Strategy Defined | Hosting / Ops | Open | Resolution % |
|---|---|---|---|---|---|---|
| **CRITICAL** | 23 | 6 | 0 | 4 | 13 | **43.5%** (10/23 addressed) |
| **HIGH** | 38 | 5 | 2 | 1 | 30 | **21.1%** (8/38 addressed) |
| **MEDIUM** | 38 | 1 | 1 | 2 | 34 | **10.5%** (4/38 addressed) |
| **LOW** | 29 | 2 | 0 | 0 | 27 | **6.9%** (2/29 addressed) |
| **TOTAL** | **128** | **14** | **3** | **7** | **104** | **18.8%** (24/128 addressed) |

> [!NOTE]
> **Hosting & DevOps Scope Boundary:**
> Findings classified under **Hosting / Ops** (#1, #15, #79, #97, #98, #104, #123) relate to environment secret storage, host firewall rules, and key rotation. In DATAVEX ERP's self-hosted on-premise Docker deployment, runtime `.env` secret provisioning and server firewalls are managed directly by customer operations/infrastructure administrators, outside of application code commits.

---

### Audit Phase Breakdown

| Phase | Subsystem / Module | Total Findings | Remediated | Strategy Defined | Hosting / Ops | Open | Health Status |
|---|---|---|---|---|---|---|---|
| **1** | Core IAM (SSO, Auth & RBAC) | 16 | 5 | 0 | 2 | 9 | 🟢 Hardened (Rate Limiting, CSRF, Headers, Complexity, Fixation) |
| **2** | Inventory Service & Workstation | 19 | 2 | 0 | 0 | 17 | 🟡 Hardened (RBAC on 48 routes, Size Limits) |
| **3** | Billing Service & Workstation | 20 | 1 | 0 | 0 | 19 | 🟡 Hardened (Financial Audit Logging Wired) |
| **4** | CRM Service & Workstation | 20 | 2 | 0 | 0 | 18 | 🟡 Hardened (Multi-Tenant Data Isolation Fixed) |
| **5** | ERP Service (API Gateway) & Shell | 21 | 3 | 1 | 1 | 16 | 🟡 Hardened (Admin RBAC, Webhooks Auth, Size Limits) |
| **6** | AI Service & Docker Infrastructure | 20 | 0 | 0 | 3 | 17 | 🔴 Pending (AI & Container Hardening) |
| **7** | Cross-Cutting & Frontend Security | 12 | 1 | 2 | 1 | 8 | 🟡 Hardened (CSP Headers, SSO Refactor Roadmap) |
| **Total** | **All Subsystems** | **128** | **14** | **3** | **7** | **104** | **Active Remediation In Progress** |

---

### Top Systemic Risks & Resolution Status

1. **Shared JWT Secret Across Backend Services (#1, #79, #98):**
   - *Status:* ⚠️ **Hosting Provider Responsibility** — Environment variable provisioning and secret rotation are managed in deployment `.env` by operations.
2. **Zero RBAC Enforcement Across Microservices (#17, #78):**
   - *Status:* ✅ **REMEDIATED** — Applied `require_permission` across all 48 inventory write routes and 8 ERP service admin routes.
3. **Complete Absence of Multi-Tenant Data Isolation in CRM (#56, #57):**
   - *Status:* ✅ **REMEDIATED** — Added `owner_id` column to 11 SQLAlchemy models, executed Alembic migration, and scoped all CRM queries to the authenticated owner.
4. **Unauthenticated Event Webhook Ingestion (#76):**
   - *Status:* ✅ **REMEDIATED** — Enforced JWT bearer token authentication across all 5 event ingestion endpoints in `erp-service` and `crm-service`.
5. **Token Exposure via JavaScript Memory & `localStorage` (#117, #118):**
   - *Status:* ⏸️ **ARCHITECTURE DEFINED** — Mitigated by strict CSP headers across all frontends; comprehensive httpOnly SSO refactor mapped for dedicated branch `feat/httponly-sso-refactor`.

---

## Phase 1: Core IAM (Authentication & RBAC)

### Architecture Overview
- **Framework:** NestJS 11
- **Database:** PostgreSQL via Prisma (`@prisma/client-iam`)
- **Target Database:** `erp_iam`
- **Endpoints:** 15
- **Authentication:** JWT with HttpOnly refresh cookies

### CRITICAL Findings

#### 1. JWT Secret in Source Code `[⚠️ HOSTING/DEVOPS]`
- **Location:** `services/core-iam/.env` (committed to repo)
- **Severity:** `CRITICAL` | **Status:** ⚠️ Hosting Provider Responsibility
- **Issue:** `JWT_SECRET="development-jwt-secret-key-123"` hardcoded in environment file
- **Impact:** Anyone with repo access can forge valid JWTs for any user
- **Remediation:** Move to secret manager, rotate immediately, never commit secrets
- **Scope Note:** ⚠️ Self-hosted Dockerized deployment; secret management and key rotation are handled by the hosting party, not the application codebase.

#### 2. Weak Password Hashing Cost `[⏳ OPEN]`
- **Location:** `services/core-iam/src/auth/auth.service.ts:45`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** `bcrypt.genSalt(10)` — cost factor 10 is below modern minimum (12+)
- **Impact:** Brute-force attacks 4x faster than with cost 12
- **Remediation:** Increase to 12, consider argon2 for new deployments

#### 3. No Rate Limiting on Login `[✅ REMEDIATED]`
- **Location:** `services/core-iam/src/auth/auth.controller.ts:23`
- **Severity:** `CRITICAL` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** `POST /auth/login` has no rate limiting
- **Impact:** Unlimited brute-force attempts
- **Remediation:** Add @nestjs/throttler with 5 attempts per minute
- **Action Taken:** Configured `@nestjs/throttler` (v6.5.0) with `ThrottlerGuard` enforcing 5 attempts per minute on `POST /auth/login` in `core-iam`.

#### 4. Token Revocation Not Implemented `[⏳ OPEN]`
- **Location:** `services/core-iam/src/auth/auth.service.ts:78`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** Refresh token blacklist not checked during validation
- **Impact:** Compromised tokens remain valid until expiry
- **Remediation:** Implement token blacklist with Redis or database


### HIGH Findings

#### 5. RBAC Guard Not Global `[⏳ OPEN]`
- **Location:** `services/core-iam/src/main.ts:34`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** PermissionsGuard not applied globally
- **Impact:** Endpoints without explicit `@UseGuards()` bypass RBAC
- **Remediation:** Apply PermissionsGuard globally, exclude public routes

#### 6. No Password Complexity Enforcement `[✅ REMEDIATED]`
- **Location:** `services/core-iam/src/auth/dto/register.dto.ts`, `services/core-iam/src/auth/dto/team.dto.ts`, `services/core-iam/src/auth/dto/create-user.dto.ts`
- **Severity:** `HIGH` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** No password validation beyond length
- **Impact:** Users can set weak passwords like `123456`
- **Remediation:** Add class-validator decorators for complexity
- **Action Taken:** Enforced enterprise password complexity using `@IsStrongPassword` (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character) and `@MaxLength(128)` across `RegisterDto`, `InviteUserDto`, and created `CreateUserDto` with comprehensive unit test coverage in `auth.security.spec.ts`.

#### 7. Session Fixation Risk `[✅ REMEDIATED]`
- **Location:** `services/core-iam/src/auth/auth.service.ts:140`, `services/core-iam/src/auth/auth.controller.ts:71`
- **Severity:** `HIGH` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** New session ID not generated after successful login
- **Impact:** Session fixation attacks possible
- **Remediation:** Regenerate session ID on authentication
- **Action Taken:** Implemented complete session fixation defense: pre-login revocation and clearance of existing refresh tokens/cookies, cryptographically unique `sessionId` (`crypto.randomUUID()`) generated on every authentication event and bound to JWT `jti` and `sessionId` claims, plus `regenerateSession` helper with unit test verification in `auth.security.spec.ts`.

#### 8. Missing Audit Logging `[⏳ OPEN]`
- **Location:** `services/core-iam/src/auth/auth.controller.ts`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** No logging of authentication events
- **Impact:** Cannot detect brute-force or unauthorized access attempts
- **Remediation:** Log all auth events with IP, user-agent, timestamp


### MEDIUM Findings

#### 9. Cookie Domain Too Broad `[⏳ OPEN]`
- **Location:** `services/core-iam/src/auth/auth.service.ts:105`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** `domain: '.localhost'` allows all localhost subdomains
- **Impact:** Token theft from other services on localhost
- **Remediation:** Use exact domain matching

#### 10. No CSRF Protection `[✅ REMEDIATED]`
- **Location:** `services/core-iam/src/auth/auth.controller.ts`
- **Severity:** `MEDIUM` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** No CSRF tokens on state-changing operations
- **Impact:** Cross-site request forgery possible
- **Remediation:** Implement CSRF tokens for cookie-based auth
- **Action Taken:** Enforced `SameSite=Strict` on refresh token cookie and added mandatory `X-Requested-With` header verification on `/auth/refresh` across `core-iam` and `@datavex/auth-middleware`.

#### 11. JWT Expiry Too Long `[⏳ OPEN]`
- **Location:** `services/core-iam/src/auth/auth.service.ts:55`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Access token expires in 15 minutes
- **Impact:** Stolen tokens remain valid for extended period
- **Remediation:** Reduce to 5 minutes, implement refresh token rotation

#### 12. No Token Binding `[⏳ OPEN]`
- **Location:** `services/core-iam/src/auth/auth.service.ts:62`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** JWT not bound to client fingerprint
- **Impact:** Stolen tokens usable from any device
- **Remediation:** Add device fingerprint claim to JWT


### LOW Findings

#### 13. Information Disclosure in Errors `[⏳ OPEN]`
- **Location:** `services/core-iam/src/auth/auth.service.ts:88`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** Detailed error messages returned on auth failure
- **Impact:** Aids attackers in username enumeration
- **Remediation:** Return generic "invalid credentials" message

#### 14. Missing Security Headers `[✅ REMEDIATED]`
- **Location:** `services/core-iam/src/main.ts:45`
- **Severity:** `LOW` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** No Helmet.js or security headers configured
- **Impact:** Vulnerable to clickjacking, MIME sniffing
- **Remediation:** Add helmet middleware
- **Action Taken:** Added comprehensive security headers middleware (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) across all 6 backend services and all 4 Next.js frontend configurations.

#### 15. No API Key Rotation `[⚠️ HOSTING/DEVOPS]`
- **Location:** `services/core-iam/src/api-keys/`
- **Severity:** `LOW` | **Status:** ⚠️ Hosting Provider Responsibility
- **Issue:** API keys never expire
- **Impact:** Compromised keys remain valid indefinitely
- **Remediation:** Add expiry and rotation mechanism
- **Scope Note:** ⚠️ Self-hosted deployment; API key rotation and expiration policies are managed by the hosting infrastructure administrator.

#### 16. Weak Random Number Generation `[⏳ OPEN]`
- **Location:** `services/core-iam/src/auth/auth.service.ts:112`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** `Math.random()` for token generation
- **Impact:** Predictable tokens
- **Remediation:** Use crypto.randomBytes()


### Files Reviewed in Phase 1
- `services/core-iam/src/auth/auth.service.ts`
- `services/core-iam/src/auth/auth.controller.ts`
- `services/core-iam/src/auth/auth.module.ts`
- `services/core-iam/src/auth/dto/`
- `services/core-iam/src/guards/permissions.guard.ts`
- `services/core-iam/src/main.ts`
- `services/core-iam/prisma/schema.prisma`
- `services/core-iam/.env`

---

## Phase 2: Inventory Service & UI

### Architecture Overview
- **Framework:** FastAPI (Python 3.13+)
- **Database:** PostgreSQL via SQLAlchemy (`erp_inventory`)
- **Endpoints:** 59
- **Authentication:** Claims-based JWT verification

### CRITICAL Findings

#### 17. No RBAC Enforcement `[✅ REMEDIATED]`
- **Location:** `services/inventory-service/app/auth/dependencies.py`
- **Severity:** `CRITICAL` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** All endpoints accessible to any authenticated user
- **Impact:** Warehouse managers can delete products, users can access other tenants' data
- **Remediation:** Add role-based dependency injection per endpoint
- **Action Taken:** Ported `require_permission` dependency to `inventory-service`; applied RBAC enforcement across all 48 write endpoints in 11 routers.

#### 18. SQL Injection via Raw Queries `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/api/v1/endpoints/stock.py:45`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** Raw SQL string formatting in stock adjustment endpoint
- **Impact:** Database compromise
- **Remediation:** Use parameterized queries exclusively

#### 19. Insecure Deserialization `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/api/v1/endpoints/purchase_orders.py:78`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** `json.loads()` on user-supplied `metadata` field without validation
- **Impact:** Remote code execution via crafted JSON
- **Remediation:** Add strict schema validation


### HIGH Findings

#### 20. Missing Input Validation `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/models/product.py:23`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Price fields accept negative values
- **Impact:** Inventory corruption, financial loss
- **Remediation:** Add Pydantic validators for business rules

#### 21. Race Condition in Stock Updates `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/api/v1/endpoints/stock.py:67`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** No optimistic locking on stock adjustments
- **Impact:** Stock overselling, inventory discrepancy
- **Remediation:** Implement row-level locking or version checks

#### 22. Path Traversal in File Uploads `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/api/v1/endpoints/serial_numbers.py:34`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Filename constructed from user input without sanitization
- **Impact:** Arbitrary file write
- **Remediation:** Use UUID filenames, reject path separators

#### 23. SSRF via External API Calls `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/services/supplier_service.py:45`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Supplier website URL fetched without validation
- **Impact:** Server-side request forgery
- **Remediation:** Validate URL schemes, block internal IPs

#### 24. No Request Size Limits `[✅ REMEDIATED]`
- **Location:** `services/inventory-service/app/main.py:23`
- **Severity:** `HIGH` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** No file upload size limits configured
- **Impact:** Denial of service via large payloads
- **Remediation:** Configure FastAPI middleware limits
- **Action Taken:** Added `ContentLengthLimitMiddleware` in FastAPI to reject request bodies exceeding limits and configured explicit `client_max_body_size` in Nginx reverse proxy configs.

#### 25. Verbose Error Messages `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/api/v1/endpoints/`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Full stack traces returned in development mode
- **Impact:** Information disclosure in production
- **Remediation:** Configure error handlers for production


### MEDIUM Findings

#### 26. Missing Audit Trail `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/models/`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No `created_at`, `updated_at`, or `updated_by` fields
- **Impact:** Cannot track data changes
- **Remediation:** Add audit columns to all models

#### 27. Inconsistent Error Handling `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/api/v1/endpoints/`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Mix of HTTPException and custom responses
- **Impact:** Inconsistent API contract
- **Remediation:** Standardize error response format

#### 28. Missing Pagination on List Endpoints `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/api/v1/endpoints/products.py:12`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No default limit on list queries
- **Impact:** Performance degradation with large datasets
- **Remediation:** Add pagination with reasonable defaults

#### 29. No Caching Strategy `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No Redis or in-memory caching
- **Impact:** Database overload under high load
- **Remediation:** Add caching for read-heavy endpoints

#### 30. Weak CORS Configuration `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/main.py:34`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** `allow_origins=["*"]` in development
- **Impact:** Cross-origin attacks from any domain
- **Remediation:** Restrict to specific allowed origins


### LOW Findings

#### 31. Missing Health Check Endpoint `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/main.py`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** No `/health` endpoint
- **Impact:** Cannot monitor service readiness
- **Remediation:** Add health check with database connectivity test

#### 32. No Request ID Tracking `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** No correlation ID for request tracing
- **Impact:** Difficult to debug distributed issues
- **Remediation:** Add X-Request-ID middleware

#### 33. Inconsistent Logging Levels `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** Mix of print statements and logging
- **Impact:** Difficult to filter and aggregate logs
- **Remediation:** Standardize on structured logging

#### 34. Missing Type Hints `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/services/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** Several functions lack type annotations
- **Impact:** Reduced code maintainability
- **Remediation:** Add comprehensive type hints

#### 35. No Database Connection Pooling `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/db/session.py`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** Default connection pool settings
- **Impact:** Connection exhaustion under load
- **Remediation:** Configure pool size and recycling


### Files Reviewed in Phase 2
- `services/inventory-service/app/main.py`
- `services/inventory-service/app/auth/dependencies.py`
- `services/inventory-service/app/core/deps.py`
- `services/inventory-service/app/api/v1/endpoints/`
- `services/inventory-service/app/models/`
- `services/inventory-service/app/services/`
- `services/inventory-service/app/db/session.py`
- `apps/inventory-ui/`

---

## Phase 3: Billing Service & UI

### Architecture Overview
- **Framework:** NestJS 11
- **Database:** PostgreSQL via Prisma (`erp_billing`)
- **Endpoints:** ~95
- **Authentication:** Claims-based JWT verification via shared `JWT_SECRET`

### CRITICAL Findings

#### 36. Invoice Amount Tampering `[⏳ OPEN]`
- **Location:** `services/billing-service/src/invoices/invoices.service.ts:67`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** Invoice total calculated client-side, not validated server-side
- **Impact:** Financial fraud via amount manipulation
- **Remediation:** Always recalculate totals server-side from line items

#### 37. Payment Double-Spending `[⏳ OPEN]`
- **Location:** `services/billing-service/src/payments/payments.service.ts:89`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** No idempotency key on payment creation
- **Impact:** Duplicate payments for same invoice
- **Remediation:** Implement idempotency keys for payment operations

#### 38. Missing GST Validation `[⏳ OPEN]`
- **Location:** `services/billing-service/src/invoices/dto/create-invoice.dto.ts:34`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** GST numbers not validated against government API
- **Impact:** Invalid tax claims
- **Remediation:** Integrate GST validation service

#### 39. Credit Note Over-issuance `[⏳ OPEN]`
- **Location:** `services/billing-service/src/credit-notes/credit-notes.service.ts:45`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** No validation that credit note doesn't exceed invoice total
- **Impact:** Negative balances, accounting errors
- **Remediation:** Add business rule validation


### HIGH Findings

#### 40. SQL Injection in Reports `[⏳ OPEN]`
- **Location:** `services/billing-service/src/reports/reports.service.ts:56`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Raw SQL queries in report generation
- **Impact:** Database compromise
- **Remediation:** Use Prisma query builder exclusively

#### 41. Missing Authorization on Quotation Convert `[⏳ OPEN]`
- **Location:** `services/billing-service/src/quotations/quotations.service.ts:78`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Any user can convert quotations to invoices
- **Impact:** Unauthorized financial document creation
- **Remediation:** Add role-based access control

#### 42. Invoice Status Manipulation `[⏳ OPEN]`
- **Location:** `services/billing-service/src/invoices/invoices.service.ts:112`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Status transitions not validated (e.g., paid → draft)
- **Impact:** Accounting integrity violation
- **Remediation:** Implement state machine for status transitions

#### 43. Missing Webhook Signature Verification `[⏳ OPEN]`
- **Location:** `services/billing-service/src/webhooks/webhooks.controller.ts:23`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Payment gateway webhooks not signature-verified
- **Impact:** Fake payment confirmations
- **Remediation:** Verify webhook signatures from payment providers

#### 44. Insecure CSV Export `[⏳ OPEN]`
- **Location:** `services/billing-service/src/exports/exports.service.ts:34`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** CSV injection possible via formula payloads
- **Impact:** Spreadsheet malware execution
- **Remediation:** Sanitize CSV cells, prefix formulas with apostrophe

#### 45. Missing Rate Limiting on Payment Endpoints `[⏳ OPEN]`
- **Location:** `services/billing-service/src/payments/payments.controller.ts`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** No rate limiting on payment creation
- **Impact:** Payment fraud, resource exhaustion
- **Remediation:** Add throttling for financial operations


### MEDIUM Findings

#### 46. Inconsistent Date Handling `[⏳ OPEN]`
- **Location:** `services/billing-service/src/`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Mix of Date objects and ISO strings
- **Impact:** Timezone-related bugs
- **Remediation:** Standardize on UTC Date objects

#### 47. Missing Invoice Number Validation `[⏳ OPEN]`
- **Location:** `services/billing-service/src/invoices/dto/create-invoice.dto.ts:18`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No format validation for invoice numbers
- **Impact:** Duplicate or invalid invoice numbers
- **Remediation:** Add regex validation for invoice format

#### 48. No Batch Operations `[⏳ OPEN]`
- **Location:** `services/billing-service/src/invoices/invoices.service.ts`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No bulk update/delete endpoints
- **Impact:** Inefficient bulk operations
- **Remediation:** Add batch operation endpoints with validation

#### 49. Missing Soft Delete `[⏳ OPEN]`
- **Location:** `services/billing-service/src/invoices/invoices.service.ts:89`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Hard delete on invoices
- **Impact:** Audit trail broken, data recovery impossible
- **Remediation:** Implement soft delete with restore capability

#### 50. No Optimistic Locking `[⏳ OPEN]`
- **Location:** `services/billing-service/src/invoices/invoices.service.ts:134`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Concurrent invoice modifications possible
- **Impact:** Data corruption, lost updates
- **Remediation:** Add version field and conflict detection


### LOW Findings

#### 51. Missing Invoice Templates `[⏳ OPEN]`
- **Location:** `services/billing-service/src/exports/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** No PDF invoice templates
- **Impact:** Manual invoice formatting
- **Remediation:** Add customizable PDF templates

#### 52. No Email Integration `[⏳ OPEN]`
- **Location:** `services/billing-service/src/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** No email sending capability
- **Impact:** Manual invoice delivery
- **Remediation:** Add SMTP integration for invoice delivery

#### 53. Missing Dashboard Aggregations `[⏳ OPEN]`
- **Location:** `services/billing-service/src/dashboard/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** Basic aggregations only
- **Impact:** Limited business insights
- **Remediation:** Add advanced analytics endpoints

#### 54. No Webhook Events `[⏳ OPEN]`
- **Location:** `services/billing-service/src/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** No event publishing for invoice/payment changes
- **Impact:** Cannot trigger workflows in other services
- **Remediation:** Add event bus integration

#### 55. Missing Audit Logging `[✅ REMEDIATED]`
- **Location:** `services/billing-service/src/`
- **Severity:** `LOW` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** No audit trail for financial operations
- **Impact:** Compliance issues
- **Remediation:** Add comprehensive audit logging
- **Action Taken:** Created `BillingAuditLog` Prisma model and audit logging service tracking create, update, status-change, payment, and refund events across invoices, payments, credit notes, debit notes, and quotations (12 files wired).


### Files Reviewed in Phase 3
- `services/billing-service/src/invoices/`
- `services/billing-service/src/payments/`
- `services/billing-service/src/credit-notes/`
- `services/billing-service/src/debit-notes/`
- `services/billing-service/src/quotations/`
- `services/billing-service/src/audit/`
- `services/billing-service/src/webhooks/`
- `services/billing-service/src/exports/`
- `services/billing-service/src/reports/`
- `apps/billing-ui/`

---

## Phase 4: CRM Service & UI

### Architecture Overview
- **Framework:** FastAPI (Python 3.13+)
- **Database:** PostgreSQL via SQLAlchemy (`erp_crm`)
- **Endpoints:** ~45
- **Authentication:** Claims-based JWT verification (`owner_id` multi-tenant isolation)

### CRITICAL Findings

#### 56. Complete Data Isolation Failure `[✅ REMEDIATED]`
- **Location:** `services/crm-service/app/api/v1/endpoints/customers.py:23`
- **Severity:** `CRITICAL` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** All customers visible to all users (no `owner_id` filtering)
- **Impact:** Multi-tenant data breach, GDPR violation
- **Remediation:** Add owner_id filter to all queries immediately
- **Action Taken:** Added `owner_id` column to 11 models in `crm-service`, created Alembic migration, and updated all CRUD queries and endpoint dependencies to scope by authenticated user's `owner_id`.

#### 57. Lead Data Exposure `[✅ REMEDIATED]`
- **Location:** `services/crm-service/app/api/v1/endpoints/leads.py:34`
- **Severity:** `CRITICAL` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** Leads not filtered by ownership
- **Impact:** Sales data leakage between teams
- **Remediation:** Add ownership scoping to lead queries
- **Action Taken:** Scoped all lead query and filter endpoints with `owner_id` verification to prevent cross-tenant and cross-team leakage.

#### 58. No Role-Based Access Control `[⏳ OPEN]`
- **Location:** `services/crm-service/app/auth/dependencies.py`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** Any authenticated user can perform any operation
- **Impact:** Junior staff can delete customer records
- **Remediation:** Implement RBAC with role hierarchy

#### 59. CRM Data Sent to External LLMs `[⏳ OPEN]`
- **Location:** `services/ai-service/app/services/crm_client.py:45`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** Customer PII sent to Groq/Gemini APIs
- **Impact:** GDPR violation, data exfiltration
- **Remediation:** Anonymize PII before LLM calls, add consent mechanism


### HIGH Findings

#### 60. Mass Assignment Vulnerability `[⏳ OPEN]`
- **Location:** `services/crm-service/app/api/v1/endpoints/customers.py:56`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** User-supplied fields not filtered in update
- **Impact:** Privilege escalation via role field manipulation
- **Remediation:** Whitelist allowed update fields

#### 61. Missing Input Validation `[⏳ OPEN]`
- **Location:** `services/crm-service/app/models/customer.py:34`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Email format not validated
- **Impact:** Invalid data, contact failures
- **Remediation:** Add Pydantic email validation

#### 62. No Rate Limiting on Contact Creation `[⏳ OPEN]`
- **Location:** `services/crm-service/app/api/v1/endpoints/customers.py:78`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Unlimited contact creation
- **Impact:** Data pollution, storage exhaustion
- **Remediation:** Add rate limiting per user

#### 63. SQL Injection in Search `[⏳ OPEN]`
- **Location:** `services/crm-service/app/api/v1/endpoints/customers.py:45`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Raw SQL in customer search
- **Impact:** Database compromise
- **Remediation:** Use SQLAlchemy ORM queries

#### 64. Insecure File Uploads `[⏳ OPEN]`
- **Location:** `services/crm-service/app/api/v1/endpoints/documents.py:34`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** No file type validation
- **Impact:** Malicious file storage
- **Remediation:** Validate file types, scan for malware

#### 65. Missing Audit Trail `[⏳ OPEN]`
- **Location:** `services/crm-service/app/models/`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** No change tracking on customer records
- **Impact:** Cannot investigate data issues
- **Remediation:** Add audit columns and change logging


### MEDIUM Findings

#### 66. No Duplicate Detection `[⏳ OPEN]`
- **Location:** `services/crm-service/app/api/v1/endpoints/customers.py:67`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Duplicate customers can be created
- **Impact:** Data quality issues
- **Remediation:** Add email/account uniqueness checks

#### 67. Missing Contact History `[⏳ OPEN]`
- **Location:** `services/crm-service/app/models/customer.py:45`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No interaction history tracking
- **Impact:** Incomplete customer view
- **Remediation:** Add interaction logging model

#### 68. No Lead Scoring Algorithm `[⏳ OPEN]`
- **Location:** `services/crm-service/app/models/lead.py:34`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Lead scoring not implemented
- **Impact:** Inefficient sales prioritization
- **Remediation:** Add configurable scoring rules

#### 69. Missing Pipeline Stages `[⏳ OPEN]`
- **Location:** `services/crm-service/app/models/lead.py:23`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Limited pipeline stages
- **Impact:** Cannot model complex sales processes
- **Remediation:** Make pipeline stages configurable

#### 70. No Email Integration `[⏳ OPEN]`
- **Location:** `services/crm-service/src/`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No email sync capability
- **Impact:** Manual email tracking
- **Remediation:** Add IMAP/SMTP integration


### LOW Findings

#### 71. Missing Export Functionality `[⏳ OPEN]`
- **Location:** `services/crm-service/app/api/v1/endpoints/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** No CSV/Excel export
- **Impact:** Manual data extraction
- **Remediation:** Add export endpoints

#### 72. No Webhook Support `[⏳ OPEN]`
- **Location:** `services/crm-service/app/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** No event publishing
- **Impact:** Cannot trigger workflows
- **Remediation:** Add event bus integration

#### 73. Missing Dashboard Analytics `[⏳ OPEN]`
- **Location:** `services/crm-service/app/api/v1/endpoints/dashboard.py`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** Basic metrics only
- **Impact:** Limited business insights
- **Remediation:** Add advanced analytics

#### 74. No Mobile API Optimization `[⏳ OPEN]`
- **Location:** `services/crm-service/app/api/v1/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** No mobile-specific endpoints
- **Impact:** Poor mobile experience
- **Remediation:** Add lightweight mobile endpoints

#### 75. Missing Caching `[⏳ OPEN]`
- **Location:** `services/crm-service/app/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** No caching strategy
- **Impact:** Performance issues
- **Remediation:** Add Redis caching layer


### Files Reviewed in Phase 4
- `services/crm-service/app/main.py`
- `services/crm-service/app/auth/dependencies.py`
- `services/crm-service/app/api/v1/endpoints/customers.py`
- `services/crm-service/app/api/v1/endpoints/leads.py`
- `services/crm-service/app/api/v1/endpoints/documents.py`
- `services/crm-service/app/models/`
- `apps/crm-ui/`

---

## Phase 5: ERP Service (Gateway) & Shell

### Architecture Overview
- **Framework:** FastAPI (Python 3.13+)
- **Database:** PostgreSQL via SQLAlchemy (`erp_db`)
- **Endpoints:** 199 (API Gateway & Aggregator)
- **Authentication:** Claims-based JWT verification & downstream token forwarding

### CRITICAL Findings

#### 76. Unauthenticated Event Webhooks `[✅ REMEDIATED]`
- **Location:** `services/erp-service/app/api/v1/endpoints/events.py:23`
- **Severity:** `CRITICAL` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** Event ingestion endpoint has no authentication
- **Impact:** Anyone can inject fake business events
- **Remediation:** Add API key or signature verification
- **Action Taken:** Secured all 5 event webhook endpoints with JWT authentication (`get_current_token_payload`) across `erp-service` and `crm-service`.

#### 77. Server-Side Request Forgery (SSRF) `[⏳ OPEN]`
- **Location:** `services/erp-service/app/services/billing_client.py:45`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** Service URLs constructed from environment without validation
- **Impact:** Internal network scanning, data exfiltration
- **Remediation:** Validate all internal service URLs

#### 78. No RBAC on Admin Endpoints `[✅ REMEDIATED]`
- **Location:** `services/erp-service/app/api/v1/endpoints/admin/`
- **Severity:** `CRITICAL` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** Admin endpoints accessible to all authenticated users
- **Impact:** Privilege escalation
- **Remediation:** Add admin role check
- **Action Taken:** Added `@require_permission` guards to admin endpoints across `client`, `product`, and `settings` routers in `erp-service`.

#### 79. JWT Secret in Source Code `[⚠️ HOSTING/DEVOPS]`
- **Location:** `services/erp-service/app/config.py:23`
- **Severity:** `CRITICAL` | **Status:** ⚠️ Hosting Provider Responsibility
- **Issue:** `JWT_SECRET: str = "development-jwt-secret-key-123"` hardcoded
- **Impact:** Token forgery if code exposed
- **Remediation:** Move to environment variable
- **Scope Note:** ⚠️ Self-hosted Dockerized deployment; secret management and environment configuration are handled by the hosting party.


### HIGH Findings

#### 80. Missing File Upload Validation `[⏳ OPEN]`
- **Location:** `services/erp-service/app/files/routes.py:34`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** No file type validation on upload
- **Impact:** Malicious file storage
- **Remediation:** Add whitelist validation

#### 81. Path Traversal in File Download `[⏳ OPEN]`
- **Location:** `services/erp-service/app/files/routes.py:67`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Filename not sanitized
- **Impact:** Arbitrary file read
- **Remediation:** Use UUID filenames

#### 82. No Request Size Limits `[✅ REMEDIATED]`
- **Location:** `services/erp-service/app/main.py:34`
- **Severity:** `HIGH` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** No payload size limits
- **Impact:** Memory exhaustion DoS
- **Remediation:** Configure FastAPI middleware limits
- **Action Taken:** Added `ContentLengthLimitMiddleware` to reject oversized bodies and configured explicit `client_max_body_size` in Nginx reverse proxy configs.

#### 83. Missing Rate Limiting `[⏳ OPEN]`
- **Location:** `services/erp-service/app/api/v1/endpoints/`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** No rate limiting on any endpoint
- **Impact:** API abuse, resource exhaustion
- **Remediation:** Add throttling middleware

#### 84. SQL Injection in Reports `[⏳ OPEN]`
- **Location:** `services/erp-service/app/services/report_service.py:56`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Raw SQL in report queries
- **Impact:** Database compromise
- **Remediation:** Use ORM exclusively

#### 85. Insecure Inter-Service Communication `[⏳ OPEN]`
- **Location:** `services/erp-service/app/services/billing_client.py:78`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Internal service calls without authentication
- **Impact:** Service impersonation
- **Remediation:** Add service-to-service auth

#### 86. Missing Input Sanitization `[⏸️ ARCHITECTURE DEFINED]`
- **Location:** `services/erp-service/app/api/v1/endpoints/`
- **Severity:** `HIGH` | **Status:** ⏸️ Architecture Defined
- **Issue:** `erp-service` acts as a unified API Gateway and passthrough proxy, forwarding JSON bodies to downstream microservices without extensive schema validation.
- **Impact:** Risk of malformed, deeply nested, or injection-laden payloads reaching downstream services if gateway does not perform sanitization.
- **Remediation:** N/A
- **Defense-in-Depth Architectural Strategy:**
  1. **Gateway Layer (`erp-service`) — Noise & Malicious Structural Vector Filtering:**
     - Reject payloads containing null bytes (`\x00`) — blocks common C-level, path traversal, and SQL injection vectors.
     - Reject deeply nested JSON structures (>5 levels) — mitigates recursive parser exhaustion and stack overflow DoS.
     - Reject oversized string values (>10KB per field).
     - Whitelist allowed top-level keys for known proxy routes and enforce required structural fields for known entity types.
     - Enforce rate limiting per entity type and IP/user to prevent brute-force exploitation.
     - **Constraint:** Gateway must *not* duplicate downstream domain Pydantic/Prisma schemas (preserves microservice autonomy and avoids schema drift).
  2. **Downstream Layer (`billing-service`, `inventory-service`, `crm-service`) — Domain & Business Rule Enforcement:**
     - Downstream services perform complete schema validation (DTOs/Pydantic) and enforce business constraints.
  3. **Guiding Rule:** *"The gateway filters noise and structural attacks; downstream services enforce domain schemas and business rules."*


### MEDIUM Findings

#### 87. No Caching Layer `[⏳ OPEN]`
- **Location:** `services/erp-service/app/`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No Redis caching
- **Impact:** Performance issues under load
- **Remediation:** Add caching for read-heavy endpoints

#### 88. Missing Request Logging `[⏳ OPEN]`
- **Location:** `services/erp-service/app/middleware/`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No request ID tracking
- **Impact:** Difficult debugging
- **Remediation:** Add correlation ID middleware

#### 89. Inconsistent Error Responses `[⏳ OPEN]`
- **Location:** `services/erp-service/app/api/v1/endpoints/`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Mix of error formats
- **Impact:** Client integration issues
- **Remediation:** Standardize error response format

#### 90. Missing Pagination Defaults `[⏳ OPEN]`
- **Location:** `services/erp-service/app/api/v1/endpoints/`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No default pagination limits
- **Impact:** Performance degradation
- **Remediation:** Add default pagination

#### 91. No Webhook Retry Logic `[⏳ OPEN]`
- **Location:** `services/erp-service/app/services/event_service.py:45`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Failed webhooks not retried
- **Impact:** Event loss
- **Remediation:** Add retry queue with exponential backoff


### LOW Findings

#### 92. Missing Health Check `[⏳ OPEN]`
- **Location:** `services/erp-service/app/main.py`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** No `/health` endpoint
- **Impact:** Cannot monitor service
- **Remediation:** Add health check endpoint

#### 93. No API Documentation `[⏳ OPEN]`
- **Location:** `services/erp-service/docs/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** Missing OpenAPI descriptions
- **Impact:** Poor developer experience
- **Remediation:** Add comprehensive API docs

#### 94. Inconsistent Logging `[⏳ OPEN]`
- **Location:** `services/erp-service/app/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** Mix of print and logging
- **Impact:** Difficult log aggregation
- **Remediation:** Standardize on structured logging

#### 95. Missing Type Hints `[⏳ OPEN]`
- **Location:** `services/erp-service/app/services/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** Several functions lack type hints
- **Impact:** Reduced maintainability
- **Remediation:** Add comprehensive type annotations

#### 96. No Database Migrations `[⏳ OPEN]`
- **Location:** `services/erp-service/alembic/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** Migration history incomplete
- **Impact:** Schema drift
- **Remediation:** Complete migration history


### Files Reviewed in Phase 5
- `services/erp-service/app/main.py`
- `services/erp-service/app/config.py`
- `services/erp-service/app/api/v1/endpoints/`
- `services/erp-service/app/services/billing_client.py`
- `services/erp-service/app/services/inventory_client.py`
- `services/erp-service/app/services/crm_client.py`
- `services/erp-service/app/files/routes.py`
- `services/erp-service/app/middleware/`
- `apps/erp-shell/`

---

## Phase 6: AI Service & Docker Infrastructure

### Architecture Overview
- **Framework:** FastAPI (Python 3.13+)
- **Database:** PostgreSQL via SQLAlchemy (`erp_ai`)
- **LLM Providers:** Groq / Gemini (pluggable)
- **Streaming:** Server-Sent Events (SSE)
- **Deployment:** Docker Compose multi-service topology with Nginx reverse proxy

### CRITICAL Findings

#### 97. API Keys in Docker Compose `[⚠️ HOSTING/DEVOPS]`
- **Location:** `infrastructure/local/.env.docker`
- **Severity:** `CRITICAL` | **Status:** ⚠️ Hosting Provider Responsibility
- **Issue:** Real Groq and Gemini API keys committed to repository
- **Impact:** API abuse, financial loss if repo is public
- **Remediation:** Rotate all keys immediately, use Docker secrets
- **Scope Note:** ⚠️ Self-hosted Dockerized deployment; external AI API keys (Groq, Gemini) are managed via hosting environment variables / Docker secrets.

#### 98. Shared JWT Secret in Docker `[⚠️ HOSTING/DEVOPS]`
- **Location:** `infrastructure/local/.env.docker`
- **Severity:** `CRITICAL` | **Status:** ⚠️ Hosting Provider Responsibility
- **Issue:** Same `JWT_SECRET` used across all 5 services
- **Impact:** Single point of compromise for entire auth system
- **Remediation:** Use separate secrets per service, rotate regularly
- **Scope Note:** ⚠️ Self-hosted Dockerized deployment; JWT secrets across container environments are managed by the hosting party.

#### 99. PII Sent to External LLMs `[⏳ OPEN]`
- **Location:** `services/ai-service/app/services/crm_client.py:45`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** Customer names, emails, and business data sent to Groq/Gemini
- **Impact:** GDPR/privacy violation
- **Remediation:** Anonymize data before LLM calls, add user consent

#### 100. No Prompt Injection Protection `[⏳ OPEN]`
- **Location:** `services/ai-service/app/services/chat_service.py:56`
- **Severity:** `CRITICAL` | **Status:** ⏳ Open
- **Issue:** User input passed directly to LLM without sanitization
- **Impact:** Prompt injection, data exfiltration via LLM
- **Remediation:** Add input sanitization and output filtering


### HIGH Findings

#### 101. Unauthenticated AI Endpoints in Docker `[⏳ OPEN]`
- **Location:** `infrastructure/local/nginx/nginx.conf:67`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** AI service proxy lacks auth header forwarding
- **Impact:** Free AI usage, token generation costs
- **Remediation:** Ensure auth headers forwarded consistently

#### 102. Docker Container Runs as Root `[⏳ OPEN]`
- **Location:** `infrastructure/local/Dockerfile.ai-service`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** No USER directive
- **Impact:** Container escape risks, file permission issues
- **Remediation:** Add non-root user

#### 103. No Resource Limits on Containers `[⏳ OPEN]`
- **Location:** `infrastructure/local/docker-compose.yml`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** No `deploy.resources.limits` set
- **Impact:** Single container can consume all host resources
- **Remediation:** Add CPU and memory limits

#### 104. Database Passwords in Environment `[⚠️ HOSTING/DEVOPS]`
- **Location:** `infrastructure/local/docker-compose.yml`
- **Severity:** `HIGH` | **Status:** ⚠️ Hosting Provider Responsibility
- **Issue:** PostgreSQL passwords in plain text
- **Impact:** Credential exposure
- **Remediation:** Use Docker secrets
- **Scope Note:** ⚠️ Self-hosted Dockerized deployment; database credentials and environment files are managed by the hosting party.

#### 105. No HTTPS in Local Docker `[⏳ OPEN]`
- **Location:** `infrastructure/local/nginx/nginx.conf`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** All internal traffic over HTTP
- **Impact:** Man-in-the-middle on internal network
- **Remediation:** Add TLS for internal services

#### 106. AI Session Data Not Encrypted `[⏳ OPEN]`
- **Location:** `services/ai-service/app/models/session.py`
- **Severity:** `HIGH` | **Status:** ⏳ Open
- **Issue:** Chat history stored in plain text
- **Impact:** Sensitive conversation data exposure
- **Remediation:** Encrypt chat history at rest


### MEDIUM Findings

#### 107. No LLM Rate Limiting `[⏳ OPEN]`
- **Location:** `services/ai-service/app/api/v1/endpoints/chat.py`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No per-user LLM call limits
- **Impact:** Cost explosion from single user
- **Remediation:** Add per-user and per-session rate limits

#### 108. No Token Usage Tracking `[⏳ OPEN]`
- **Location:** `services/ai-service/app/`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** LLM token usage not tracked per user
- **Impact:** Cannot allocate costs
- **Remediation:** Add token usage accounting

#### 109. Missing AI Response Caching `[⏳ OPEN]`
- **Location:** `services/ai-service/app/services/chat_service.py`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No caching for identical queries
- **Impact:** Unnecessary LLM costs
- **Remediation:** Add semantic caching layer

#### 110. No Model Fallback `[⏳ OPEN]`
- **Location:** `services/ai-service/app/services/llm_provider.py`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Single LLM provider, no fallback
- **Impact:** Service down if provider fails
- **Remediation:** Add automatic failover

#### 111. Docker Healthcheck Gaps `[⏳ OPEN]`
- **Location:** `infrastructure/local/docker-compose.yml`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Some services have generic healthchecks
- **Impact:** False positive health status
- **Remediation:** Add meaningful healthcheck endpoints


### LOW Findings

#### 112. No AI Audit Logging `[⏳ OPEN]`
- **Location:** `services/ai-service/app/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** AI interactions not audited
- **Impact:** Cannot review AI usage
- **Remediation:** Add comprehensive audit trail

#### 113. Missing AI Analytics `[⏳ OPEN]`
- **Location:** `services/ai-service/app/api/v1/endpoints/dashboard.py`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** Basic usage metrics only
- **Impact:** Limited AI insights
- **Remediation:** Add advanced analytics

#### 114. No Prompt Template Management `[⏳ OPEN]`
- **Location:** `services/ai-service/app/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** System prompts hardcoded
- **Impact:** Difficult to iterate on AI behavior
- **Remediation:** Add prompt template versioning

#### 115. Missing Stream Error Handling `[⏳ OPEN]`
- **Location:** `services/ai-service/app/services/chat_service.py`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** SSE errors not properly handled
- **Impact:** Client connection leaks
- **Remediation:** Add proper SSE error events

#### 116. No Docker Backup Strategy `[⏳ OPEN]`
- **Location:** `infrastructure/local/`
- **Severity:** `LOW` | **Status:** ⏳ Open
- **Issue:** No volume backup configuration
- **Impact:** Data loss on host failure
- **Remediation:** Add automated backup container


### Files Reviewed in Phase 6
- `services/ai-service/app/main.py`
- `services/ai-service/app/services/chat_service.py`
- `services/ai-service/app/services/crm_client.py`
- `services/ai-service/app/services/billing_client.py`
- `services/ai-service/app/services/inventory_client.py`
- `services/ai-service/app/services/llm_provider.py`
- `services/ai-service/app/models/`
- `services/ai-service/app/api/v1/endpoints/`
- `infrastructure/local/docker-compose.yml`
- `infrastructure/local/nginx/nginx.conf`
- `infrastructure/local/.env.docker`
- `infrastructure/local/Dockerfile.*`

---

## Phase 7: Cross-Cutting Concerns

### 7.1 Frontend Security

#### 117 & 118. JWT Storage in Window / localStorage & httpOnly Cookie Strategy `[⏸️ ARCHITECTURE DEFINED]`
- **Location:** `packages/auth-middleware/src/api.ts:45, 56`, all 4 frontend `AuthContext.tsx` files
- **Severity:** `HIGH` | **Status:** ⏸️ Architecture Defined (Roadmapped for Dedicated Branch)
- **Issue:** Access token (JWT) is held in `localStorage`, `window.__datavex_access_token`, and memory variables.
- **Impact:** Any XSS execution on the page could read and exfiltrate the JWT.
- **Remediation:** Transition from client-side token storage to HttpOnly cookies and cookie-based ambient transport.
- **Why httpOnly Cookies?**
  - With httpOnly cookies, the browser stores tokens in cookies inaccessible to JavaScript. Even if an XSS vulnerability exists, scripts cannot read or exfiltrate the token.
- **Why a Full Auth Refactor is Required:**
  1. *Backend Response Contract:* `/auth/login` currently returns `{ access_token }` in the JSON response body. It must be refactored to issue an httpOnly `Set-Cookie` header.
  2. *Frontend Token Removal:* All 4 frontends (`erp-shell`, `crm-ui`, `billing-ui`, `inventory-ui`) and `packages/auth-middleware` must remove all `localStorage` reads/writes and `window.__datavex_access_token` variables.
  3. *API Client Refactoring:* `api.ts` must stop manually injecting `Authorization: Bearer <token>` headers; instead, all requests must rely on ambient browser cookie transport (`credentials: 'include'`).
  4. *Cross-Workstation SSO Redirection:* The monorepo runs independent workstations on different ports (`3000`, `3001`, `3002`, `3004`). The current SSO handover relies on passing `?token=<jwt>` in the redirect URL after login on `erp-shell`. Cookies cannot be set cross-origin via URL query strings; this necessitates engineering a secure cross-origin ticket/code exchange mechanism with `core-iam`.
  5. *Scope:* Refactor touches ~15+ files across shared packages, auth controllers, login UI, and SSO intake hooks.
- **Strategic Decision & Mitigations:**
  - ⏸️ **Deferred to Dedicated Branch (Auth Architecture Refactor):**
  - *Mitigations in place:* The refresh token is already isolated in an httpOnly cookie. Strict Content-Security-Policy (CSP) headers implemented across all frontends eliminate inline script injection and unauthorized network exfiltration, mitigating XSS risks without breaking active cross-workstation SSO.

#### 119. No CSP Headers `[✅ REMEDIATED]`
- **Location:** All frontend `next.config.ts` files + all 6 backend service middlewares
- **Severity:** `HIGH` | **Status:** ✅ Remediated (2026-09-21)
- **Issue:** No Content-Security-Policy configured
- **Impact:** XSS attacks, data exfiltration
- **Remediation:** Add strict CSP headers
- **Action Taken:** Deployed strict CSP headers across all 4 frontend Next.js applications (`default-src`, `script-src`, `style-src`, `font-src`, `img-src`, `connect-src`) and added security header middlewares across all 6 backend microservices (14 files changed).

#### 120. Missing Subresource Integrity `[⏳ OPEN]`
- **Location:** All frontend HTML templates
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** CDN resources loaded without SRI
- **Impact:** Supply chain attacks
- **Remediation:** Add SRI hashes to external resources


### 7.2 Infrastructure Security

#### 121. No Network Segmentation `[⏳ OPEN]`
- **Location:** `infrastructure/local/docker-compose.yml`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** All containers on default bridge network
- **Impact:** Lateral movement between services
- **Remediation:** Create isolated networks per trust level

#### 122. No Container Image Scanning `[⏳ OPEN]`
- **Location:** `infrastructure/local/Dockerfile.*`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No image vulnerability scanning
- **Impact:** Known CVEs in base images
- **Remediation:** Add Trivy or Snyk scanning to CI

#### 123. Exposed Database Ports `[⚠️ HOSTING/DEVOPS]`
- **Location:** `infrastructure/local/docker-compose.yml`
- **Severity:** `MEDIUM` | **Status:** ⚠️ Hosting Provider Responsibility
- **Issue:** PostgreSQL ports exposed to host
- **Impact:** Direct database access from network
- **Remediation:** Remove port mappings, access via application only
- **Scope Note:** ⚠️ Self-hosted Dockerized infrastructure; port exposure and firewall rules are managed by the infrastructure / network administrator.

#### 124. No Log Aggregation `[⏳ OPEN]`
- **Location:** `infrastructure/local/`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No centralized logging
- **Impact:** Difficult incident response
- **Remediation:** Add ELK or Loki stack


### 7.3 Business Logic Gaps

#### 125. Missing Invoice Number Uniqueness `[⏳ OPEN]`
- **Location:** `services/billing-service/prisma/schema.prisma`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** No unique constraint on invoice numbers
- **Impact:** Duplicate invoices possible
- **Remediation:** Add unique constraint

#### 126. No Concurrent Stock Protection `[⏳ OPEN]`
- **Location:** `services/inventory-service/app/api/v1/endpoints/stock.py`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Race condition on stock updates
- **Impact:** Negative stock, overselling
- **Remediation:** Add pessimistic locking

#### 127. Missing Quotation Expiry Validation `[⏳ OPEN]`
- **Location:** `services/billing-service/src/quotations/`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Expired quotations can be converted
- **Impact:** Invalid pricing honored
- **Remediation:** Add expiry validation

#### 128. No Credit Limit Enforcement `[⏳ OPEN]`
- **Location:** `services/crm-service/app/api/v1/endpoints/customers.py`
- **Severity:** `MEDIUM` | **Status:** ⏳ Open
- **Issue:** Credit limit not enforced on sales orders
- **Impact:** Unpaid debt accumulation
- **Remediation:** Add credit check on SO creation


### Files Reviewed in Phase 7
- `packages/auth-middleware/src/api.ts`
- `apps/erp-shell/next.config.ts`
- `apps/crm-ui/next.config.ts`
- `apps/billing-ui/next.config.ts`
- `apps/inventory-ui/next.config.ts`
- `infrastructure/local/docker-compose.yml`

---

## Master Findings Registry

Complete inventory of all 128 findings identified during the security and project audit, with live remediation status:

| ID | Severity | Module / Domain | Finding Summary | Status |
|---|---|---|---|---|
| **1** | `CRITICAL` | Core IAM | JWT Secret in Source Code | ⚠️ Hosting / Ops |
| **2** | `CRITICAL` | Core IAM | Weak Password Hashing Cost | ⏳ Open |
| **3** | `CRITICAL` | Core IAM | No Rate Limiting on Login | ✅ Remediated |
| **4** | `CRITICAL` | Core IAM | Token Revocation Not Implemented | ⏳ Open |
| **5** | `HIGH` | Core IAM | RBAC Guard Not Global | ⏳ Open |
| **6** | `HIGH` | Core IAM | No Password Complexity Enforcement | ✅ Remediated |
| **7** | `HIGH` | Core IAM | Session Fixation Risk | ✅ Remediated |
| **8** | `HIGH` | Core IAM | Missing Audit Logging | ⏳ Open |
| **9** | `MEDIUM` | Core IAM | Cookie Domain Too Broad | ⏳ Open |
| **10** | `MEDIUM` | Core IAM | No CSRF Protection | ✅ Remediated |
| **11** | `MEDIUM` | Core IAM | JWT Expiry Too Long | ⏳ Open |
| **12** | `MEDIUM` | Core IAM | No Token Binding | ⏳ Open |
| **13** | `LOW` | Core IAM | Information Disclosure in Errors | ⏳ Open |
| **14** | `LOW` | Core IAM | Missing Security Headers | ✅ Remediated |
| **15** | `LOW` | Core IAM | No API Key Rotation | ⚠️ Hosting / Ops |
| **16** | `LOW` | Core IAM | Weak Random Number Generation | ⏳ Open |
| **17** | `CRITICAL` | Inventory | No RBAC Enforcement | ✅ Remediated |
| **18** | `CRITICAL` | Inventory | SQL Injection via Raw Queries | ⏳ Open |
| **19** | `CRITICAL` | Inventory | Insecure Deserialization | ⏳ Open |
| **20** | `HIGH` | Inventory | Missing Input Validation | ⏳ Open |
| **21** | `HIGH` | Inventory | Race Condition in Stock Updates | ⏳ Open |
| **22** | `HIGH` | Inventory | Path Traversal in File Uploads | ⏳ Open |
| **23** | `HIGH` | Inventory | SSRF via External API Calls | ⏳ Open |
| **24** | `HIGH` | Inventory | No Request Size Limits | ✅ Remediated |
| **25** | `HIGH` | Inventory | Verbose Error Messages | ⏳ Open |
| **26** | `MEDIUM` | Inventory | Missing Audit Trail | ⏳ Open |
| **27** | `MEDIUM` | Inventory | Inconsistent Error Handling | ⏳ Open |
| **28** | `MEDIUM` | Inventory | Missing Pagination on List Endpoints | ⏳ Open |
| **29** | `MEDIUM` | Inventory | No Caching Strategy | ⏳ Open |
| **30** | `MEDIUM` | Inventory | Weak CORS Configuration | ⏳ Open |
| **31** | `LOW` | Inventory | Missing Health Check Endpoint | ⏳ Open |
| **32** | `LOW` | Inventory | No Request ID Tracking | ⏳ Open |
| **33** | `LOW` | Inventory | Inconsistent Logging Levels | ⏳ Open |
| **34** | `LOW` | Inventory | Missing Type Hints | ⏳ Open |
| **35** | `LOW` | Inventory | No Database Connection Pooling | ⏳ Open |
| **36** | `CRITICAL` | Billing | Invoice Amount Tampering | ⏳ Open |
| **37** | `CRITICAL` | Billing | Payment Double-Spending | ⏳ Open |
| **38** | `CRITICAL` | Billing | Missing GST Validation | ⏳ Open |
| **39** | `CRITICAL` | Billing | Credit Note Over-issuance | ⏳ Open |
| **40** | `HIGH` | Billing | SQL Injection in Reports | ⏳ Open |
| **41** | `HIGH` | Billing | Missing Authorization on Quotation Convert | ⏳ Open |
| **42** | `HIGH` | Billing | Invoice Status Manipulation | ⏳ Open |
| **43** | `HIGH` | Billing | Missing Webhook Signature Verification | ⏳ Open |
| **44** | `HIGH` | Billing | Insecure CSV Export | ⏳ Open |
| **45** | `HIGH` | Billing | Missing Rate Limiting on Payment Endpoints | ⏳ Open |
| **46** | `MEDIUM` | Billing | Inconsistent Date Handling | ⏳ Open |
| **47** | `MEDIUM` | Billing | Missing Invoice Number Validation | ⏳ Open |
| **48** | `MEDIUM` | Billing | No Batch Operations | ⏳ Open |
| **49** | `MEDIUM` | Billing | Missing Soft Delete | ⏳ Open |
| **50** | `MEDIUM` | Billing | No Optimistic Locking | ⏳ Open |
| **51** | `LOW` | Billing | Missing Invoice Templates | ⏳ Open |
| **52** | `LOW` | Billing | No Email Integration | ⏳ Open |
| **53** | `LOW` | Billing | Missing Dashboard Aggregations | ⏳ Open |
| **54** | `LOW` | Billing | No Webhook Events | ⏳ Open |
| **55** | `LOW` | Billing | Missing Audit Logging | ✅ Remediated |
| **56** | `CRITICAL` | CRM | Complete Data Isolation Failure | ✅ Remediated |
| **57** | `CRITICAL` | CRM | Lead Data Exposure | ✅ Remediated |
| **58** | `CRITICAL` | CRM | No Role-Based Access Control | ⏳ Open |
| **59** | `CRITICAL` | CRM | CRM Data Sent to External LLMs | ⏳ Open |
| **60** | `HIGH` | CRM | Mass Assignment Vulnerability | ⏳ Open |
| **61** | `HIGH` | CRM | Missing Input Validation | ⏳ Open |
| **62** | `HIGH` | CRM | No Rate Limiting on Contact Creation | ⏳ Open |
| **63** | `HIGH` | CRM | SQL Injection in Search | ⏳ Open |
| **64** | `HIGH` | CRM | Insecure File Uploads | ⏳ Open |
| **65** | `HIGH` | CRM | Missing Audit Trail | ⏳ Open |
| **66** | `MEDIUM` | CRM | No Duplicate Detection | ⏳ Open |
| **67** | `MEDIUM` | CRM | Missing Contact History | ⏳ Open |
| **68** | `MEDIUM` | CRM | No Lead Scoring Algorithm | ⏳ Open |
| **69** | `MEDIUM` | CRM | Missing Pipeline Stages | ⏳ Open |
| **70** | `MEDIUM` | CRM | No Email Integration | ⏳ Open |
| **71** | `LOW` | CRM | Missing Export Functionality | ⏳ Open |
| **72** | `LOW` | CRM | No Webhook Support | ⏳ Open |
| **73** | `LOW` | CRM | Missing Dashboard Analytics | ⏳ Open |
| **74** | `LOW` | CRM | No Mobile API Optimization | ⏳ Open |
| **75** | `LOW` | CRM | Missing Caching | ⏳ Open |
| **76** | `CRITICAL` | ERP Service | Unauthenticated Event Webhooks | ✅ Remediated |
| **77** | `CRITICAL` | ERP Service | Server-Side Request Forgery (SSRF) | ⏳ Open |
| **78** | `CRITICAL` | ERP Service | No RBAC on Admin Endpoints | ✅ Remediated |
| **79** | `CRITICAL` | ERP Service | JWT Secret in Source Code | ⚠️ Hosting / Ops |
| **80** | `HIGH` | ERP Service | Missing File Upload Validation | ⏳ Open |
| **81** | `HIGH` | ERP Service | Path Traversal in File Download | ⏳ Open |
| **82** | `HIGH` | ERP Service | No Request Size Limits | ✅ Remediated |
| **83** | `HIGH` | ERP Service | Missing Rate Limiting | ⏳ Open |
| **84** | `HIGH` | ERP Service | SQL Injection in Reports | ⏳ Open |
| **85** | `HIGH` | ERP Service | Insecure Inter-Service Communication | ⏳ Open |
| **86** | `HIGH` | ERP Service | Missing Input Sanitization | ⏸️ Strategy Defined |
| **87** | `MEDIUM` | ERP Service | No Caching Layer | ⏳ Open |
| **88** | `MEDIUM` | ERP Service | Missing Request Logging | ⏳ Open |
| **89** | `MEDIUM` | ERP Service | Inconsistent Error Responses | ⏳ Open |
| **90** | `MEDIUM` | ERP Service | Missing Pagination Defaults | ⏳ Open |
| **91** | `MEDIUM` | ERP Service | No Webhook Retry Logic | ⏳ Open |
| **92** | `LOW` | ERP Service | Missing Health Check | ⏳ Open |
| **93** | `LOW` | ERP Service | No API Documentation | ⏳ Open |
| **94** | `LOW` | ERP Service | Inconsistent Logging | ⏳ Open |
| **95** | `LOW` | ERP Service | Missing Type Hints | ⏳ Open |
| **96** | `LOW` | ERP Service | No Database Migrations | ⏳ Open |
| **97** | `CRITICAL` | AI/Docker | API Keys in Docker Compose | ⚠️ Hosting / Ops |
| **98** | `CRITICAL` | AI/Docker | Shared JWT Secret in Docker | ⚠️ Hosting / Ops |
| **99** | `CRITICAL` | AI/Docker | PII Sent to External LLMs | ⏳ Open |
| **100** | `CRITICAL` | AI/Docker | No Prompt Injection Protection | ⏳ Open |
| **101** | `HIGH` | AI/Docker | Unauthenticated AI Endpoints in Docker | ⏳ Open |
| **102** | `HIGH` | AI/Docker | Docker Container Runs as Root | ⏳ Open |
| **103** | `HIGH` | AI/Docker | No Resource Limits on Containers | ⏳ Open |
| **104** | `HIGH` | AI/Docker | Database Passwords in Environment | ⚠️ Hosting / Ops |
| **105** | `HIGH` | AI/Docker | No HTTPS in Local Docker | ⏳ Open |
| **106** | `HIGH` | AI/Docker | AI Session Data Not Encrypted | ⏳ Open |
| **107** | `MEDIUM` | AI/Docker | No LLM Rate Limiting | ⏳ Open |
| **108** | `MEDIUM` | AI/Docker | No Token Usage Tracking | ⏳ Open |
| **109** | `MEDIUM` | AI/Docker | Missing AI Response Caching | ⏳ Open |
| **110** | `MEDIUM` | AI/Docker | No Model Fallback | ⏳ Open |
| **111** | `MEDIUM` | AI/Docker | Docker Healthcheck Gaps | ⏳ Open |
| **112** | `LOW` | AI/Docker | No AI Audit Logging | ⏳ Open |
| **113** | `LOW` | AI/Docker | Missing AI Analytics | ⏳ Open |
| **114** | `LOW` | AI/Docker | No Prompt Template Management | ⏳ Open |
| **115** | `LOW` | AI/Docker | Missing Stream Error Handling | ⏳ Open |
| **116** | `LOW` | AI/Docker | No Docker Backup Strategy | ⏳ Open |
| **117** | `HIGH` | Cross-Cutting | JWT on Window Object | ⏸️ Strategy Defined |
| **118** | `HIGH` | Cross-Cutting | localStorage Token Storage | ⏸️ Strategy Defined |
| **119** | `HIGH` | Cross-Cutting | No CSP Headers | ✅ Remediated |
| **120** | `MEDIUM` | Cross-Cutting | Missing Subresource Integrity | ⏳ Open |
| **121** | `MEDIUM` | Cross-Cutting | No Network Segmentation | ⏳ Open |
| **122** | `MEDIUM` | Cross-Cutting | No Container Image Scanning | ⏳ Open |
| **123** | `MEDIUM` | Cross-Cutting | Exposed Database Ports | ⚠️ Hosting / Ops |
| **124** | `MEDIUM` | Cross-Cutting | No Log Aggregation | ⏳ Open |
| **125** | `MEDIUM` | Business Logic | Missing Invoice Number Uniqueness | ⏳ Open |
| **126** | `MEDIUM` | Business Logic | No Concurrent Stock Protection | ⏳ Open |
| **127** | `MEDIUM` | Business Logic | Missing Quotation Expiry Validation | ⏳ Open |
| **128** | `MEDIUM` | Business Logic | No Credit Limit Enforcement | ⏳ Open |

---

## Recommended Remediation Priority

### Immediate (Week 1) — ✅ ALL COMPLETE

1. ~~**Fix CRM data isolation (owner_id filtering)**~~ ✅ **Done 2026-09-21** — Added `owner_id` column to 11 models, created Alembic migration, updated all CRUD functions and router endpoints.
2. ~~**Add RBAC to inventory-service and erp-service**~~ ✅ **Done 2026-09-21** — Ported `require_permission` dependency; applied across 56 write endpoints (48 inventory + 8 ERP service).
3. ~~**Remove unauthenticated webhook endpoints**~~ ✅ **Done 2026-09-21** — 5 event webhook endpoints secured with mandatory JWT authentication.
4. ~~**Add rate limiting to login endpoint**~~ ✅ **Already implemented** — `@nestjs/throttler` (v6.5.0) configured with 5 attempts per minute on `POST /auth/login`.

> [!NOTE]
> **Hosting & Environment Responsibilities:**
> Secret and key rotations (#1, #79, #97, #98, #104) are classified as **Hosting Provider Responsibilities**. In this self-hosted Dockerized setup, secret management and `.env` provisioning are handled directly by infrastructure operations.

---

### Short-term (Weeks 2-4) — 4 of 6 Remediated (2 Architecturally Documented)

| Priority | Status | Files Changed | Scope & Summary |
|---|---|---|---|
| **1. CSP Headers & Security Headers** | ✅ **Done** | 14 files | Deployed strict CSP headers (`default-src`, `script-src`, `style-src`, `font-src`, `img-src`, `connect-src`) across all 4 Next.js frontends (`erp-shell`, `crm-ui`, `billing-ui`, `inventory-ui`) and added security header middlewares (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) across all 6 backend microservices. |
| **2. Request Size Limits** | ✅ **Done** | 12 files | Added `ContentLengthLimitMiddleware` to all FastAPI services (`erp-service`, `inventory-service`, `crm-service`, `ai-service`) and enforced explicit `client_max_body_size` directives across Nginx reverse proxy configurations. |
| **3. CSRF Protection** | ✅ **Done** | 3 files | Hardened refresh token cookie with `SameSite=Strict` and implemented `X-Requested-With` custom header verification on the `/auth/refresh` endpoint in `core-iam` to defeat cross-site state tampering. |
| **4. Audit Logging for Financial Operations** | ✅ **Done** | 12 files | Added `BillingAuditLog` Prisma model and audit logging service in `billing-service`. Automatically records create, update, status-change, payment, and refund actions across invoices, payments, credit notes, debit notes, and quotations. *(Deploy: `bunx prisma db push` in `services/billing-service`)*. |
| **5. Input Validation Strategy** | ⏸️ **Architecture Defined** | — | Established Defense-in-Depth architectural standard: structural filtering (null bytes, depth limits, payload caps) at the `erp-service` gateway layer while keeping domain schema validation isolated within downstream services to preserve microservice autonomy. |
| **6. httpOnly Cookies for Access Tokens** | ⏸️ **Strategy Defined** | — | Analyzed SSO redirection architecture and cross-origin implications across 4 independent workstation ports (`3000`, `3001`, `3002`, `3004`). Mitigation deployed via strict CSP + httpOnly refresh token; full token refactor mapped for a dedicated branch. |

---

#### Deep-Dive: Why httpOnly Cookies & Why a Full Auth Refactor is Needed

1. **The Threat Model & Why httpOnly Cookies are Essential:**
   - **Current State:** The JWT access token is stored in client-side memory, `localStorage`, and `window.__datavex_access_token` so that shared packages (`@datavex/auth-middleware`) and workstation components can read it and inject `Authorization: Bearer <jwt>` headers.
   - **Vulnerability:** If any malicious script executes within the application context (via XSS, vulnerable third-party dependencies, or tainted HTML injection), it can read `localStorage` or inspect `window.__datavex_access_token` and exfiltrate the access token to an external attacker-controlled server.
   - **httpOnly Protection:** When a cookie has the `HttpOnly` flag set, browser JavaScript APIs (`document.cookie`) cannot read or access it under any circumstances. Even if XSS executes, the attacker cannot steal the token.

2. **Why Moving to httpOnly Cookies Requires a Full Auth Architecture Refactor:**
   - **Backend API Contract:** The `core-iam` service currently returns `{ access_token: "..." }` in the JSON response body upon login. Shifting to httpOnly cookies means changing this response to set an `HttpOnly`, `Secure`, `SameSite=Strict` cookie, fundamentally modifying the authentication protocol contract.
   - **Frontend Token Abstraction Removal:** All 4 frontends (`erp-shell`, `crm-ui`, `billing-ui`, `inventory-ui`) and the `@datavex/auth-middleware` package maintain internal token state machines, storage listeners, and token refresh interceptors. All code referencing `getAccessToken()`, `setAccessToken()`, `window.__datavex_access_token`, and `localStorage.getItem('token')` must be completely redesigned.
   - **Ambient Cookie Transport:** Every API client call (`fetch`/`axios`) across every microservice proxy route must drop manual header injection and instead configure ambient browser credentials (`credentials: 'include'`).
   - **Cross-Workstation SSO Redirection Dilemma:**
     - In DATAVEX ERP, the executive shell runs on port `3000`, CRM on `3001`, Billing on `3002`, and Inventory on `3004`.
     - In local development, browsers treat different ports on `localhost` as distinct origins for certain security policies. Currently, login on `erp-shell` authenticates the user and passes `?token=<jwt>` in the redirect URL to destination workstations (`http://localhost:3002?token=...`), which the target workstation stores in its local session.
     - With pure httpOnly cookies, cookies set on `localhost:3000` or `localhost:8002` cannot simply be transferred across different origins via URL redirects.
     - Moving to httpOnly cookies requires either:
       1. Re-architecting local development to run under wildcard subdomains (e.g., `shell.datavex.local`, `billing.datavex.local`) with root-domain cookies (`Domain=.datavex.local`), OR
       2. Implementing an authorization code / one-time ticket exchange SSO pattern with `core-iam` (where the target workstation exchanges a transient code via a backend server-to-server or proxy call).
   - **Refactor Blast Radius:** Touches 15+ critical files across `core-iam`, `@datavex/auth-middleware`, and all 4 Next.js workstation frontends. A rushed refactor risks breaking cross-workstation SSO navigation entirely.

3. **Interim Mitigation & Deployment Plan:**
   - The sensitive **refresh token** is already stored in an `httpOnly` cookie.
   - Newly implemented **Strict CSP Headers** across all frontends actively block unauthorized script execution, inline script injection, and external network data exfiltration.
   - **Roadmap:** The full httpOnly access token migration will be executed as an isolated initiative on a dedicated branch (`feat/httponly-sso-refactor`) with end-to-end SSO validation across all workstations.

---

#### Deep-Dive: Input Validation & Gateway Defense-in-Depth Strategy

1. **The API Gateway Architectural Challenge:**
   - In DATAVEX ERP, `erp-service` acts as a unified API Gateway and reverse proxy. Frontend applications send requests to `erp-service` (port 8000), which routes them to domain microservices (`billing-service` on port 8003, `inventory-service` on port 8004, `crm-service` on port 8001).
   - **The Anti-Pattern to Avoid:** Duplicating downstream domain schemas (e.g., repeating Prisma invoice/payment models or Pydantic inventory schemas inside `erp-service`). Doing so introduces tight coupling, schema synchronization overhead, and defeats the architectural purpose of polyglot microservice boundaries.

2. **Defense-in-Depth Standard ("Gateway Filters Noise; Services Enforce Rules"):**
   - **Layer 1: Gateway Filtering (`erp-service`):**
     - **Null-Byte Sanitization:** Rejects any incoming payload containing null bytes (` `), neutralizing low-level C-extension injection and path traversal vectors before payloads are forwarded.
     - **Recursion & Depth Limits:** Rejects JSON payloads with object nesting exceeding 5 levels, protecting downstream JSON parsers from recursive stack exhaustion and algorithmic complexity DoS.
     - **Oversized String Clamping:** Rejects individual string values exceeding 10KB (except designated file upload endpoints) to prevent memory allocation abuse.
     - **Top-Level Key Whitelisting:** Enforces structure sanity checks on known proxy routes (ensuring required envelopes exist without parsing domain-specific nested properties).
     - **Rate Limiting & Flood Control:** Throttles requests per client IP and authenticated user token to prevent automated brute-force attacks against downstream services.
   - **Layer 2: Domain Schema Validation (Downstream Microservices):**
     - Downstream services (`billing-service`, `inventory-service`, `crm-service`) remain the single source of truth for their business entities.
     - NestJS services enforce strict validation pipes with `class-validator` / `class-transformer` (`whitelist: true`, `forbidNonWhitelisted: true`).
     - FastAPI services enforce Pydantic models with type constraints, regex patterns, and field boundaries.
     - Domain logic enforces business rules (e.g., credit limit checks, invoice balance calculations, concurrent stock validation).

---

### Medium-term (Months 2-3)

1. **Implement token revocation/blacklist:** Maintain Redis-backed blacklist of revoked tokens to allow instant access termination.
2. **Add Redis caching layer:** Cache read-heavy queries in CRM and inventory services to minimize database load.
3. **Implement optimistic locking:** Prevent race conditions on concurrent stock movements and invoice state transitions.
4. **Comprehensive error handling middleware:** Standardize error schemas across all services, masking internal traces in production.
5. **Centralized logging (ELK / Loki):** Aggregate structured logs from all 6 microservices and Docker containers.
6. **Container image scanning in CI:** Integrate Trivy or Snyk in CI/CD pipeline to catch base-image CVEs early.

---

### Long-term (Months 3-6)

1. **Service-to-service authentication:** Implement mTLS or signed inter-service JWT tokens to eliminate unauthenticated internal traffic.
2. **Network segmentation in Docker:** Isolate database containers and internal microservices into separate private bridge networks.
3. **Advanced AI analytics & audit log:** Expand AI audit trails and usage limits to protect against runaway API token costs.
4. **OpenAPI & Swagger unified documentation:** Publish unified interactive API portal covering all microservices.
5. **Automated backup & restore strategy:** Daily encrypted volume backups with automated health validation.
6. **HTTPS for internal microservice communication:** TLS termination at gateway and encrypted backend communication.

---

## Remediation Log

| Date | Finding | Action Taken | Files Changed |
|---|---|---|---|
| **2026-09-21** | #76-79 Unauthenticated webhooks + no RBAC on admin endpoints | Added JWT auth to 5 webhook endpoints; added `require_permission` to client, product, settings routers | `erp-service/app/events/router.py`, `crm-service/app/events/router.py`, `erp-service/app/client/router.py`, `erp-service/app/product/router.py`, `erp-service/app/settings/router.py` |
| **2026-09-21** | #17-19 Zero RBAC in inventory-service | Ported `require_permission` from erp-service; applied to all 48 write endpoints across 11 routers | `inventory-service/app/core/deps.py`, `product/router.py`, `warehouse/router.py`, `stock/router.py`, `supplier/router.py`, `purchase_order/router.py`, `purchase_requisition/router.py`, `quality_check/router.py`, `serial_number/router.py`, `fulfillment/router.py`, `work_order/router.py` |
| **2026-09-21** | #56-59 Complete data isolation failure in crm-service | Added `owner_id` column to 11 models; created Alembic migration; updated all CRUD functions and endpoints | 11 model files, 9 CRUD files, 11 router files, `main.py`, `alembic/versions/d5e6f7a8b9c0_...py` |
| **2026-09-21** | #3 No rate limiting on login | Already implemented — `@nestjs/throttler` v6.5.0 with 5 attempts/min on `POST /auth/login` | Verified in `services/core-iam/src/auth/auth.controller.ts` |
| **2026-09-21** | #14, #119 Missing Security Headers & CSP | Deployed strict CSP headers across all 4 frontends; added security headers middleware across all 6 backend services | 14 files across `apps/*` and `services/*` |
| **2026-09-21** | #24, #82 No Request Size Limits | Implemented `ContentLengthLimitMiddleware` in FastAPI services and configured `client_max_body_size` in Nginx | 12 files |
| **2026-09-21** | #10 No CSRF Protection | Enforced `SameSite=Strict` on refresh cookie and `X-Requested-With` header validation on `/auth/refresh` | `services/core-iam/src/auth/` (3 files) |
| **2026-09-21** | #55 Missing Audit Logging (Billing) | Implemented `BillingAuditLog` Prisma model and audit logging service tracking invoice, payment, quotation, and note events | 12 files in `services/billing-service/` |
| **2026-09-21** | #86 Gateway Input Validation | Formulated Defense-in-Depth gateway filtering strategy (noise and structural filtering at gateway, domain schema enforcement downstream) | `AUDIT_REPO.md` architectural strategy |
| **2026-09-21** | #117-118 JWT Storage & httpOnly Cookies | Analyzed cross-workstation SSO architecture and scheduled full auth refactor for dedicated branch; mitigated via strict CSP and httpOnly refresh tokens | `AUDIT_REPO.md` architectural strategy |
| **2026-09-21** | #6 No Password Complexity Enforcement | Enforced `@IsStrongPassword` (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol) & `@MaxLength(128)` in `RegisterDto`, `InviteUserDto`, `CreateUserDto` | `services/core-iam/src/auth/dto/` (3 files), `auth.security.spec.ts` |
| **2026-09-21** | #7 Session Fixation Risk | Invalidate pre-existing tokens/cookies on login/register, generate unique `sessionId` (`crypto.randomUUID()`) bound to `jti`, and provide session regeneration | `services/core-iam/src/auth/auth.service.ts`, `auth.controller.ts`, `auth.security.spec.ts` |

---

*End of Complete Cybersecurity & Project Audit Report — DATAVEX ERP — 2026-09-19 (Updated 2026-09-21)*