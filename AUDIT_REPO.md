# DATAVEX ERP — Repository Audit Report

**Audit date:** 2026-08-22 · **Last updated:** 2026-08-28
**Scope:** Entire monorepo — 4 frontend apps, 5 backend services, 2 shared packages, infrastructure configs.

---

## Executive Summary

| Severity | Open | Resolved |
|----------|------|----------|
| CRITICAL | **0** | 6 |
| HIGH | **8** | 7 |
| MEDIUM | **0** | 23 |
| LOW | **0** | 12 |
| UI/UX | **0** | 18 |

**Total: 8 open findings** · **66 resolved**

---

## Open Findings — HIGH (8)

### Auth Hardening (H1–H5)

**H1. Login timing attack + email enumeration**
`core-iam auth.service.ts:24-41` — unknown emails skip bcrypt compare (~100 ms difference) and return distinct messages. Need constant-time dummy-hash compare + uniform "Invalid credentials".

**H2. Refresh cookie hardcodes `secure: false`**
`core-iam auth.controller.ts:39-46` — no environment gating; in HTTPS the 7-day refresh token travels over plaintext HTTP.

**H3. Refresh rotation non-atomic, no reuse detection**
`core-iam auth.service.ts` — revoke + create are two statements without `$transaction`; reuse of a revoked token just 401s — no theft detection.

**H4. Open registration grants Organization Owner**
`core-iam dto/register.dto.ts` — any role string accepted; defaults to `'Organization Owner'` with a full org provisioned. Registration is not rate-limited.

**H5. Hardcoded invited-user password**
`core-iam auth.service.ts:402` — `data.password || 'User@123!'`.

### Event & Consumer Integrity (H14–H15)

**H14. Event consumers default to organization 1**
`billing-service invoices-consumer.controller.ts:20,115` and `inventory-service worker.py:20,147` — `Number(data.organization_id || 1)` fallback. Fail loudly instead.

**H15. Presigned URLs — no nginx vhost for MinIO**
`erp-service minio_client.py` — URL signing and event loop blocking already fixed. Remaining: no reverse proxy for MinIO in production; browsers may not reach the endpoint.

---

## Resolved — Sprint 4 (H6–H13)

| ID | Finding | Resolution |
|----|---------|------------|
| H6 | SnakeCaseInterceptor corrupts Prisma.Decimal | Special-cases Decimal via `toJSON()` detection — ships number, not `{s,e,d}` |
| H7 | Global-unique document numbers vs per-org sequences | Changed `@unique` to `@@unique([organizationId, invoiceNumber/quoteNumber])` — requires `prisma db push` |
| H8 | Lost-update race on invoice paidAmount | Atomic `{ increment }` + LEAST clamp in raw SQL after increment |
| H9 | Refunding pending/failed payments corrupts balances | Guard now blocks `pending` and `failed` status refunds |
| H10 | Invoice deletion has no state guard | *(deferred — requires cascade audit)* |
| H11 | Stock mutations are non-atomic | Added `SELECT ... FOR UPDATE()` to adjust_stock and record_movement |
| H12 | Fulfillment reservation race + phantom reservations | Added `FOR UPDATE()` + ATP validation before reserving |
| H13 | Events published before DB commit (phantom events) | Moved all `eventBus.emit()` calls outside `$transaction` — events fire only after commit |

---

## What Held Up Well

- inventory-service auth: every router chains `Depends(get_current_org_id)`
- Validation pipes: billing uses `forbidNonWhitelisted: true`; Pydantic contracts solid
- JWT secret consistency: all four services agree on shared secret
- MinIO object keys: uuid4 prefixes — no collision risk
- Alembic chains: all migrations chain correctly
- Frontend proxies: all 4 workstations route `/files/*` to erp-service
- MinIO async: all sync calls wrapped in `asyncio.to_thread()`
- Shared auth middleware: notification-provider uses `getAccessToken()` from `@datavex/auth-middleware`

---

## Remediation Roadmap

~~Sprint 1 — security stopgaps~~ ✅
~~Sprint 2 — file pipeline~~ ✅
~~Sprint 3 — medium fixes~~ ✅
~~Sprint 4 — concurrency & money integrity (H6–H13)~~ ✅
~~Sprint 6 — schema & config hygiene~~ ✅

**Sprint 5 — auth hardening (H1–H5)**
1. H1: constant-time dummy-hash compare + uniform "Invalid credentials"
2. H2: gate cookie `secure` flag by `NODE_ENV`
3. H3: wrap refresh rotation in `$transaction` + revoke all user tokens on reuse
4. H4: restrict registration to invite-only or require admin approval
5. H5: remove default invite password; require explicit password
