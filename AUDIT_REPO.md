# DATAVEX ERP — Cybersecurity Audit Report

**Date:** 2026-09-09
**Last Updated:** 2026-09-10 (Critical fixes applied)
**Scope:** Full monorepo audit — 6 backend services, 4 frontend apps, Docker infrastructure, Nginx configs, shared packages
**Methodology:** Static code analysis, configuration review, architecture review

---

## Executive Summary

The DATAVEX ERP codebase has **strong foundational security** (ORM-only queries, centralized SSO, presigned file URLs, RBAC, account lockout). Initially, **7 critical** and **9 high** severity vulnerabilities were identified. **All 7 critical vulnerabilities have been remediated.** Remaining high/medium/low issues should be addressed before production deployment.

| Severity | Original | Fixed | Remaining |
|----------|----------|-------|-----------|
| Critical | 7 | 7 | 0 |
| High | 9 | 0 | 9 |
| Medium | 10 | 0 | 10 |
| Low / Info | 5 | 0 | 5 |
| **Total** | **31** | **7** | **24** |

---

## Vulnerability Findings

### CRITICAL (All Fixed)

| # | Vulnerability | Location | Status |
|---|--------------|----------|--------|
| 1 | **Hardcoded JWT secret** (`development-jwt-secret-key-123`) as default in all 5 backend services | `services/*/app/core/config.py`, `services/core-iam/.env:2` | **FIXED** — Removed defaults; JWT_SECRET is now mandatory env var. Docker Compose uses `${JWT_SECRET:?}` syntax |
| 2 | **Real API keys committed to git** — Groq and Gemini keys in `.env.docker` | `infrastructure/local/.env.docker:35,37` | **FIXED** — Replaced with placeholders. `.env.docker` is gitignored. **Rotate old keys externally** |
| 3 | **SSRF via lead discovery scraper** — arbitrary user-supplied URLs with no internal IP blocklist | `services/crm-service/app/lead_discovery/router.py:101-112` | **FIXED** — Added `_validate_scrape_url()` with DNS resolution check, RFC 1918/loopback/link-local/cloud metadata blocking |
| 4 | **`secure: false` hardcoded on refresh cookie** — tokens transmitted over HTTP | `services/core-iam/src/auth/auth.controller.ts:50` | **FIXED** — Now reads `NODE_ENV`; `secure: true` in production, `false` in development |
| 5 | **crm-service accepts tokens without `type` claim** — `type=None` + `role` accepted as valid | `services/crm-service/app/core/security.py:8` | **FIXED** — Strictly requires `type === "access"` like all other services |
| 6 | **No rate limiting on central API gateway** — `RATE_LIMIT_ENABLED: bool = False` | `services/erp-service/app/core/config.py:21` | **FIXED** — Enabled by default, added `slowapi` rate limiter middleware |
| 7 | **All backend ports exposed to host** — bypass Nginx security layer entirely | `infrastructure/local/docker-compose.yml` (all service port mappings) | **FIXED** — Removed host port mappings for all 6 backend services; accessible only via Nginx |

### HIGH

| # | Vulnerability | Location | Impact |
|---|--------------|----------|--------|
| 8 | **Access token passed via URL query string** during SSO redirect | `apps/erp-shell/app/(auth)/login/page.tsx:69,76,78,80` | Token in browser history, referrer headers, proxy logs |
| 9 | **Access token stored in localStorage** — vulnerable to XSS exfiltration | `packages/auth-middleware/src/api.ts:12-14` | Token theft via any XSS vulnerability |
| 10 | **No CSRF protection anywhere** — no tokens, no `SameSite=Strict`, no double-submit | All services | Cross-site request forgery on state-changing endpoints |
| 11 | **No security headers on any of the 4 Next.js frontends** — no CSP, X-Frame-Options, HSTS | All `apps/*/next.config.ts` | Clickjacking, MIME sniffing, protocol downgrade |
| 12 | **core-iam and billing-service have no security headers middleware** | `services/core-iam/src/main.ts`, `services/billing-service/src/main.ts` | Same as above for auth and billing responses |
| 13 | **core-iam CORS allows null origin + any localhost port** | `services/core-iam/src/main.ts:32-37` | Arbitrary localhost origin accepted, null origin bypass |
| 14 | **billing-service CORS allows any `*.erp.local` subdomain** | `services/billing-service/src/main.ts:27` | Any subdomain of erp.local is valid CORS origin |
| 15 | **Weak password validation** — only `@MinLength(6)`, no complexity. erp-service has `validate_password_strength()` but it's not wired to core-iam | `services/core-iam/src/auth/dto/register.dto.ts:15` | Weak passwords allowed on account creation |
| 16 | **Default password `User@123!` for invited users** with no forced password change | `services/core-iam/src/auth/auth.service.ts:462` | Predictable credentials for new accounts |

### MEDIUM

| # | Vulnerability | Location | Impact |
|---|--------------|----------|--------|
| 17 | **Hardcoded DB credentials** (`postgres:root`) across all FastAPI services | `services/*/app/core/config.py`, `core-iam/.env:1` | Database access if source code leaked |
| 18 | **Hardcoded RabbitMQ `guest:guest`** | `services/billing-service/src/main.ts:34,48` | Message broker admin access |
| 19 | **Hardcoded RustFS `minioadmin:minioadmin`** | `services/erp-service/app/core/config.py:28-29` | Object storage admin access |
| 20 | **No request body size limits** on any FastAPI app | All FastAPI `main.py` files | DoS via memory exhaustion with large payloads |
| 21 | **OpenAPI docs publicly accessible** with no auth | All FastAPI `main.py` (docs_url enabled) | Full API surface exposure to unauthenticated users |
| 22 | **crm-service ignores CORS_ORIGINS env var** — hardcoded origins | `services/crm-service/app/main.py:83-88` | Docker Compose CORS overrides have no effect |
| 23 | **Raw SQL template literal in core-iam** — `lockDurationMinutes` interpolated into SQL interval | `services/core-iam/src/auth/auth.service.ts:60-72` | Potential SQL injection if config is compromised |
| 24 | **Content-Disposition header injection** — unsanitized `view`/`as_of_date` params | `services/erp-service/app/billing/router.py:491-496` | HTTP response splitting |
| 25 | **core-iam PermissionsGuard doesn't check token `type`** | `services/core-iam/src/auth/guards/permissions.guard.ts:36` | Refresh tokens usable on admin endpoints |
| 26 | **Flat Docker network** — all 16+ containers on single bridge | `infrastructure/local/docker-compose.yml:460-463` | No network segmentation, lateral movement |

### LOW / INFORMATIONAL

| # | Vulnerability | Location | Impact |
|---|--------------|----------|--------|
| 27 | Prompt injection risk in AI service — unsanitized context data in system prompts | `services/ai-service/app/router.py:129-135` | LLM behavior manipulation |
| 28 | No Nginx `limit_req`/`limit_conn` for rate limiting defense-in-depth | `infrastructure/local/nginx/nginx.conf` | No upstream DoS protection |
| 29 | RustFS Nginx proxy uses `Access-Control-Allow-Origin: *` wildcard CORS | `infrastructure/local/nginx/nginx.conf:156-158` | Any origin can read RustFS responses |
| 30 | Seed user passwords in source code | `services/core-iam/prisma/seed.ts:174-205` | Credential exposure to repo readers |
| 31 | Production Nginx missing `proxy_buffering off` — SSE streaming broken | `infrastructure/internal/nginx/nginx.conf` | AI chat SSE fails in production |

---

## Brute Force Resistance Assessment

| Attack Vector | Defense | Verdict |
|---------------|---------|---------|
| **Login password guessing** | Core-iam: 5 attempts/min throttle + 5 failures → 15-min lockout + atomic race-safe increment | **STRONG** |
| **Login username enumeration** | Different error messages for "no account" vs "wrong password" | **WEAK** |
| **API endpoint brute force** | erp-service gateway: slowapi rate limiter enabled (100/min default). crm/inventory/ai: NONE | **MODERATE** (improved) |
| **JWT secret brute force** | Mandatory env var, no hardcoded default — strong random secret required | **STRONG** (fixed) |
| **Credential stuffing** | Gateway rate limiting + login throttling. No CAPTCHA. | **MODERATE** (improved) |
| **JWT token brute force** | HS256 with 256-bit key (if proper secret used) | **STRONG** |
| **Password spray** | No cross-IP lockout, no geographic anomaly detection | **MODERATE** |
| **DoS via large payloads** | No body size limits on any FastAPI service | **WEAK** |
| **DoS via LLM exhaustion** | ai-service rate limit configured (30/min) but not registered as middleware | **WEAK** |
| **WebSocket brute force** | JWT validated per connection, no message rate limiting | **MODERATE** |
| **Refresh token brute force** | SHA-256 hashed, 40-byte random tokens (256-bit entropy) | **STRONG** |
| **SQL injection for auth bypass** | ORM-only except 1 raw SQL in core-iam | **STRONG** (mostly) |

---

## Project Strengths (Good Security Practices)

| Strength | Details |
|----------|---------|
| **Centralized SSO** | Single auth service (core-iam) with JWT + HttpOnly refresh cookie |
| **Refresh token rotation** | Old tokens revoked on refresh, SHA-256 hashed storage, 40-byte random generation |
| **Account lockout** | Atomic SQL increment prevents race conditions, configurable threshold/duration |
| **bcrypt password hashing** | Salt rounds 10-12, industry standard |
| **ORM-only database queries** | 120+ `db.execute()` calls all use SQLAlchemy `select()` — no raw SQL (except 1 instance) |
| **Presigned file URLs** | Binary files never pass through backend servers — direct client-to-RustFS |
| **Data isolation** | All models enforce `owner_id` scoping from JWT claims |
| **RBAC enforcement** | `@Permissions()` decorators + guards on protected endpoints |
| **Security headers on erp-service** | X-Frame-Options DENY, HSTS, CSP, X-Content-Type-Options, Referrer-Policy |
| **File upload validation** | MIME regex whitelist, 10MB limit, bucket allowlist, org-scoped access |
| **Input validation** | Pydantic models in FastAPI, class-validator in NestJS DTOs |
| **Error handling** | Generic messages to clients, stack traces logged server-side only |
| **Request logging** | Unique X-Request-ID, duration tracking, no token logging |
| **Non-root Docker containers** | All containers run as non-root users |
| **Internal production compose** | Uses `?:` mandatory variable syntax — fails if secrets aren't set |

---

## Top 5 Remediation Priorities

| Priority | Action | Effort | Status |
|----------|--------|--------|--------|
| **1** | ~~Remove all hardcoded secret defaults~~ | Low | **DONE** |
| **2** | ~~Enable rate limiting on erp-service gateway~~ | Low | **DONE** |
| **3** | Replace URL-based token passing with cookie-based handoff or short-lived authorization codes | Medium | Pending |
| **4** | Add CSP + security headers to all 4 Next.js frontends via `headers()` in `next.config.ts` | Low | Pending |
| **5** | ~~Block SSRF in lead discovery~~ | Medium | **DONE** |
