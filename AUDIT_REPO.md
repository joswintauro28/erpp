# DATAVEX ERP — Full Repository Audit Report

**Audit date:** 2026-08-22 · **Last updated:** 2026-08-27
**Scope:** Entire monorepo — 4 frontend apps, 5 backend services, 2 shared packages, infrastructure configs.
**Method:** Manual code review + parallel deep-dive agents across services, packages, and infra. All quoted findings were verified against source.

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| **CRITICAL** | **0** | **All 6 resolved** — RBAC hardened, MIME fixed, IDOR scoping, file_id contract, billing fetch, docker scripts |
| **HIGH** | **15** | **All open** — timing attacks, non-atomic money/stock, Decimal corruption, global-vs-org unique, phantom events |
| **MEDIUM** | **3** | **20/23 resolved** — M13 (step_back), M14 (dispatch warehouse), M18 (shortage provisioning) deferred |
| **LOW** | **12** | **All open** — dev secrets, hardcoded topology, dead models, missing FKs, no type verification |
| **UI/UX** | **2** | **16/18 resolved** — U10 (pagination), U12 (responsive tables) deferred |

**Remaining focus:** Concurrency correctness (H8–H12), auth hardening (H1–H5), Decimal corruption (H6), and schema hygiene (L7–L9).

---

## Resolved Findings (reference)

### CRITICAL ✅ All Resolved

| ID | Finding | Resolution Date |
|----|---------|-----------------|
| C1 | RBAC bypass — PermissionsGuard allow-all | 2026-08-27 — deny-by-default + @Permissions on all routes |
| C2 | MIME regex matches literal `image/*` | 2026-08-26 — corrected to `image/[a-z0-9.+_-]+` |
| C3 | IDOR — no org scoping on file endpoints | 2026-08-26 — `_org_filter()` on all 5 handlers |
| C4 | file_id contract break — generic CRUD drops key | 2026-08-27 — `file_id` column added to 4 CRM models |
| C5 | billing-service can't fetch files from erp-service | 2026-08-26 — JWT forwarded + presigned URL two-step |
| C6 | Docker stop scripts destroy volumes | 2026-08-27 — `down` preserves volumes; `destroy` verb requires confirmation |

### MEDIUM ✅ Resolved (20/23)

| ID | Finding | Resolution |
|----|---------|------------|
| M1 | Account-lockout non-atomic counter | Atomic `UPDATE` via `$queryRaw` |
| M2 | CORS wildcard with credentials | Removed `*.erp.local` regex |
| M3 | Deactivated users keep valid tokens | `getUserMe` throws on `!isActive` |
| M4 | Duplicate memberships / seed re-runs | `@@unique` + seed `upsert` |
| M5 | Duplicate rolePerms / weak bcrypt | `@@unique` + `genSalt(12)` |
| M6 | Manual sent→paid skips payment | Removed `"paid"` from `sent` transitions |
| M7 | Recurring scheduler fabricates GST | Default `"intrastate"` |
| M8 | Consumer idempotency dead P2002 catch | Removed unreachable catch |
| M9 | Bank recon no transaction | Wrapped in `$transaction` |
| M10 | Payments lack guards | Draft/void check + overpayment clamping |
| M11 | Currency USD vs INR | All journals + schema → `"INR"` |
| M12 | No ThrottlerModule on billing | `ThrottlerModule` with `APP_GUARD` |
| M15 | Stock race condition | `UniqueConstraint(org, product, warehouse)` |
| M16 | Worker silently acks poisoned messages | `message.nack(requeue=False)` on error |
| M17 | Duplicate serial numbers | `UniqueConstraint(org, serial_number)` |
| M19 | Bare `except: pass` | Logged warnings |
| M20 | JWT in WS query param | Documented (browser API limitation) |
| M21 | Notification REST bypasses proxies | Default to same-origin |
| M22 | crm-service CORS `*` with credentials | Explicit origins |
| M23 | Pending FileRecords never cleaned | Self-cleanup on each upload |

### UI/UX ✅ Resolved (16/18)

| ID | Finding | Resolution |
|----|---------|------------|
| U1 | ~50 silent catch blocks | `handleError()` utility + 90+ replacements |
| U2 | Zero keyboard navigation | Escape/Enter/Space handlers |
| U3 | Inconsistent page headers | `PageHeader` standardized |
| U4 | Missing form validation | `required`/`minLength`/`maxLength` added |
| U5 | Missing focus-visible styles | Global `focus-visible:ring-2` |
| U6 | Duplicated color maps | Shared `color-maps.ts` |
| U7 | Hardcoded hex colors | Theme variables |
| U8 | Inconsistent Button variants | `variant="secondary"` → `"outline"`; `size="sm"` in modals |
| U9 | Missing loading.tsx | 16 new skeleton files |
| U11 | Inconsistent search naming | Standardized to `search`/`setSearch` |
| U13 | Inconsistent Badge usage | Standardized variant mapping |
| U14 | Duplicated SectionHeading | Removed local copies |
| U15 | Inconsistent spacing scale | Standardized gap/space-y values |
| U16 | console.error in production | All replaced with `handleError()` |
| U17 | Missing skip-to-content | Added to all 4 layouts |
| U18 | Inconsistent error display | Toast + inline banner standard |

---

## 1. HIGH Findings (all open)

### H1. Login timing attack + email enumeration
**core-iam** `src/auth/auth.service.ts:24-41` — unknown emails skip the bcrypt compare entirely (~100 ms difference) and return distinct messages ("No account found with this email address"). Constant-time dummy-hash compare + uniform "Invalid credentials" needed.

### H2. Refresh cookie hardcodes `secure: false`
**core-iam** `src/auth/auth.controller.ts:39-46` — no environment gating; in any HTTPS deployment the 7-day refresh token travels over plaintext HTTP.

### H3. Refresh rotation non-atomic, no reuse detection
**core-iam** `auth.service.ts:277-281` (revoke) and `:306-314` (create) are two statements without `$transaction`; reuse of a revoked token just 401s — no theft detection (should revoke all user tokens).

### H4. Open registration grants Organization Owner
**core-iam** `dto/register.dto.ts:16-18`, `register()` at `service:185,197` — any role string accepted; defaults to `'Organization Owner'` with a full org provisioned. Only login is rate-limited; registration is not.

### H5. Hardcoded invited-user password
**core-iam** `auth.service.ts:402` — `data.password || 'User@123!'`.

### H6. `SnakeCaseInterceptor` corrupts `Prisma.Decimal` values
**billing-service** `src/common/snake-case.interceptor.ts:13-25` — enumerates any non-Date object as a plain map. `Decimal` instances expose internal props `{s, e, d}`, so raw-model returns ship garbage money:
- `internal.service.ts:79,164,175`
- `revenue.service.ts:173-192`
- `bank-reconciliation.service.ts:699`

**Fix:** special-case Decimal (use `toJSON`/`toFixed`) or ban raw-model returns.

### H7. Global-unique document numbers vs per-org sequences
**billing-service** `prisma/schema.prisma:80,205` — `invoiceNumber @unique`, `quoteNumber @unique` are **global**, but `document-number.service.ts:22-46` computes MAX+1 scoped by `organization_id`. Same defect in **inventory-service**: `Product.sku`, `PurchaseOrder.order_number`, `PurchaseRequisition.pr_number`, `WorkOrder.work_order_no`.

### H8. Lost-update race on invoice `paidAmount`
**billing-service** `payments.service.ts:114-136` (`clearPayment`) and `:234-257` (`refund`):
Plain RMW under READ COMMITTED — two concurrent payments lose an increment.

**Fix:** `data: { paidAmount: { increment } }` or row locks.

### H9. Refunding pending/failed payments corrupts balances
**billing-service** `payments.service.ts:225-232` — guard only blocks `status === "refunded"`; refunding a **pending** payment subtracts money that was never added.

### H10. Invoice deletion has no state guard and orphans payments
**billing-service** `invoices/invoices.service.ts:609-616` — no draft-only check; deleting a paid invoice cascades items while `Payment.invoiceId onDelete: SetNull` leaves orphaned records.

### H11. Stock mutations are non-atomic (oversell / negative stock)
**inventory-service** `app/stock/services.py:85-100`, `:156-179`:
```python
stock.quantity -= quantity    # no SELECT ... FOR UPDATE, no atomic UPDATE
```

### H12. Fulfillment reservation race + phantom reservations
**inventory-service** `app/fulfillment/services.py:201-221` — ATP check and `reserved_quantity +=` are separate unlocked steps.

### H13. Events published before DB commit (phantom events)
- **inventory-service** `app/core/events.py:64-66` — fire-and-forget AMQP publish spawned immediately.
- **billing-service** publishes inside `$transaction` blocks despite an existing-but-unused `OutboxRecord` table.

### H14. Event consumers default to organization 1
**billing-service** `invoices-consumer.controller.ts:20,115` and **inventory-service** `worker.py:20,147`:
```ts
const organizationId = Number(data.organization_id || 1);
```
Fail loudly instead.

### H15. Presigned URLs point at an endpoint browsers may not reach
**erp-service** `app/files/minio_client.py:22-27` — URLs are signed against `MINIO_ENDPOINT`. No nginx vhost exists for MinIO; also the sync `minio` client is invoked inside `async def` handlers — **blocks the event loop**.

---

## 2. MEDIUM Findings (3 deferred)

### M13. `step_back(DISPATCHED→PACKED)` never restores deducted quantity/reserved
**inventory-service** `app/fulfillment/services.py:811-836` — reversing a dispatch never restores the quantity that was deducted or the reservation that was made, causing perpetual stock shrinkage.

### M14. Dispatch picks arbitrary warehouse row
**inventory-service** `app/fulfillment/services.py:305-306,318` — dispatch uses `scalars().first()` to pick a warehouse, which returns an arbitrary row when multiple warehouses hold stock. Also records movement with negative quantity, contradicting `record_movement`'s positive-quantity contract.

### M18. Shortage auto-provisioning invents suppliers, warehouses, SKUs
**inventory-service** `app/fulfillment/services.py:91-95,437-443,457-465` — when stock is short, the system creates fake suppliers (`supplier@vendor.com`), random warehouses, and SKUs (`SKU-{randint(1000,9999)}`) that collide with the global-unique SKU constraint.

---

## 3. LOW Findings (all open)

| # | Finding | Location |
|---|---------|----------|
| L1 | `$queryRawUnsafe` with interpolated identifiers (currently constant — landmine) | billing `document-number.service.ts:31-35` |
| L2 | Dev secrets committed across services: identical `JWT_SECRET`, `postgres:root`, RabbitMQ `guest:guest` | various `.env`/defaults |
| L3 | Hardcoded topology: `http://localhost:8000/8003` fallbacks in bank-recon, inventory, notification | multiple |
| L4 | Billing `AuthGuard` never verifies token `type` claim (inventory does correctly) | billing `auth.guard.ts:41-44` |
| L5 | `delete_object` swallows all `S3Error`s — silent orphaned objects possible | erp `minio_client.py:88-94` |
| L6 | BaseRepository get/update/delete don't filter `organization_id` | inv `database.py:42-70` |
| L7 | No FK constraints on Stock/StockMovement/SerialNumber/Supplier/Warehouse | inventory models |
| L8 | Dead models: `Invitation` (core-iam schema:169-185), `ReconciliationReport` (billing schema:330-347) | schemas |
| L9 | Unreachable `PaymentStatus` values (`failed`, `completed`) still counted/matched | billing schema:38-44 |
| L10 | Raw `fetch` with manual Bearer in notification-provider duplicates auth logic | notification-provider.tsx:79 |
| L11 | Similar revision IDs `a1b2c3d4e5f6` vs `a1b2c3d4e5f7` invite human confusion | erp alembic versions |
| L12 | GEMINI/GROQ API keys present in local env files without rotation guidance | crm-service `.env.example` |

---

## 4. UI/UX Findings (2 deferred)

| ID | Finding | Status |
|----|---------|--------|
| U10 | No pagination on most list views | ⏳ Deferred — requires shared `DataTable` with server-side pagination |
| U12 | No responsive table → card fallback | ⏳ Deferred — 18 tables use `overflow-x-auto`; no card-based mobile layout |

---

## 5. What Held Up Well

- **inventory-service auth**: every router chains `Depends(get_current_org_id)`; token-type enforcement correct.
- **Validation pipes**: billing uses `forbidNonWhitelisted: true`; FastAPI/Pydantic contracts solid.
- **JWT secret consistency**: all four services currently agree on the shared secret.
- **MinIO object keys**: `make_object_key` uses uuid4 prefixes — no collision risk.
- **Alembic chains**: both new migrations chain correctly off their respective heads.
- **Frontend proxies**: all 4 workstations correctly route `/files/*` to erp-service.
- **MinIO async**: all sync SDK calls wrapped in `asyncio.to_thread()` — event loop not blocked.

---

## 6. Remediation Roadmap

~~**Sprint 1 — security stopgaps**~~ ✅ DONE
~~**Sprint 2 — file pipeline**~~ ✅ DONE
~~**Sprint 3 — medium fixes**~~ ✅ DONE (3 deferred)

**Sprint 4 — concurrency & money integrity (H6–H12)**
1. H8/H9: atomic `increment` for `paidAmount`; refund-state guard for pending payments.
2. H11/H12: `FOR UPDATE` / atomic UPDATE for stock; reservation caps.
3. H7: per-org unique constraints for all document numbers.
4. H13: outbox pattern (table already exists in billing) or publish-after-commit hooks.
5. H6: Decimal-safe SnakeCaseInterceptor.

**Sprint 5 — auth hardening (H1–H5)**
6. H1: constant-time dummy-hash compare + uniform "Invalid credentials".
7. H2: gate cookie `secure` flag by `NODE_ENV`.
8. H3: wrap refresh rotation in `$transaction` + revoke all user tokens on reuse.
9. H4: restrict registration to invite-only or require admin approval.
10. H5: remove default invite password; require explicit password.

**Sprint 6 — schema & config hygiene (L1–L12)**
11. L7: add FK constraints on inventory models.
12. L8: drop dead models (`Invitation`, `ReconciliationReport`).
13. L9: remove unreachable `PaymentStatus` values.
14. L2/L3: externalize secrets + inter-service URLs.
15. L4: verify token `type` claim in billing AuthGuard.
