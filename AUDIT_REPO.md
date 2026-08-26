# DATAVEX ERP — Full Repository Audit Report

**Audit date:** 2026-08-22
**Scope:** Entire monorepo — 4 frontend apps, 5 backend services, 2 shared packages, infrastructure configs.
**Method:** Manual code review + parallel deep-dive agents across services, packages, and infra. All quoted findings were verified against source.

---

## Executive Summary

| Severity | Count | Summary |
|----------|-------|---------|
| **CRITICAL** | 7 | RBAC bypass in core-iam; broken image-upload validation; broken erp-shell file routing; cross-tenant file access (IDOR); file attach flow silently drops files end-to-end; billing→erp file fetch cannot work; volume-destroying stop scripts |
| **HIGH** | 15 | Timing attacks, non-atomic money/stock math, Decimal corruption in responses, global-vs-org unique collisions, phantom events before commit |
| **MEDIUM** | ~25 | Lockout DoS, CORS misconfigs, scheduler fabrication, consumer org-defaulting, dead schema models |
| **LOW** | ~12 | Committed dev secrets, hardcoded topology, boilerplate leftovers |

The three most urgent clusters:

1. **core-iam RBAC is decorative.** The `PermissionsGuard` allows any request without `@Permissions(...)` metadata, and **zero routes carry that metadata** — any logged-in user can grant their own role every permission (`PUT /auth/roles/:id/permissions`).
2. **The MinIO file pipeline (Phases 1–7) shipped with four independent defects**: images are rejected by a literal-asterisk regex; erp-shell's proxy strips `/api` so its file calls 404; every endpoint lacks org scoping (cross-tenant read/delete of files); and the frontend sends `file_id` while backend models store `file_uri`, so attachments are silently discarded by generic CRUD.
3. **Concurrency correctness**: invoice `paidAmount` updates and all inventory stock mutations are plain read-modify-write — lost updates under load produce under-charged invoices and oversold stock.

---

## 1. CRITICAL Findings

### C1. Full RBAC bypass — any authenticated user can self-promote to admin
**Service:** core-iam · `src/auth/guards/permissions.guard.ts:37-40`

```ts
// If no permissions are explicitly annotated, JWT verification is sufficient
if (!requiredPermissions || requiredPermissions.length === 0) {
  return true;
}
```

No route in core-iam uses the `@Permissions(...)` decorator (verified by grep). Consequences — all reachable by *any* valid JWT:

- `PUT /auth/roles/:id/permissions` → `updateRolePermissions()` does `deleteMany + createMany` on **any role, no org scoping** (`auth.service.ts:547-562`) — a user edits their own role to hold every permission. Permissions are baked into JWTs until refresh, making escalation persistent.
- `PUT /auth/users/:id/role` accepts arbitrary `roleId` with no validation (`controller:181-190`, `service:473-490`).
- `POST /auth/users`, `DELETE /auth/users/:id`, `PUT /auth/users/:id/status` similarly unprotected.

This nullifies the entire seeded RBAC matrix.

**Fix:** Add `@Permissions(...)` to every admin route AND flip the guard to deny-by-default when metadata is absent.

---

### C2. Image uploads are rejected — MIME regex matches the literal string `image/*`
**Service:** erp-service · `app/files/router.py:30-37`

```python
_MIME_PATTERN = re.compile(
    r"^(image/\*|application/pdf|text/csv|..."
```

The alternative `image/\*` matches the **literal string** `"image/*"`, not real types like `image/png`. Since `_validate_mime(body.mime_type)` runs against the actual uploaded type:

- `image/png`, `image/jpeg` … → **400 rejected**
- A client sending the literal string `"image/*"` → accepted (validation inverted!)

Every frontend modal passes `accept="application/pdf,image/*"`; browsers resolve that to concrete types, so **all image uploads fail**.

**Fix:** `r"^image/[a-z0-9.+_-]+|application/pdf|..."`.

---

### C3. File API unreachable from erp-shell — proxy strips `/api`, router requires it
**Apps/services:** erp-shell `proxy.ts:22` ↔ erp-service `app/files/router.py:27`

```ts
// erp-shell proxy.ts — strips /api prefix
url = new URL(`${path}${search}`, BACKEND_URL);   // /api/files/x → :8000/files/x
```
```python
router = APIRouter(prefix="/api/files", tags=["files"])   # expects /api/files/x
```

Result: `/api/files/*` requests from **erp-shell 404**, while crm-ui / billing-ui / inventory-ui proxies (which preserve `/api` when routing `/files/` to port 8000) work. The other erp-service routers follow the stripped-prefix convention (`/clients`, `/crm`, …); the files router broke it.

**Fix:** Either change the router prefix to `/files` (and update the three other proxies), or preserve `/api` for `/files/*` in the erp-shell proxy like the other workstations do.

---

### C4. Cross-tenant file access (IDOR) — zero organization scoping on every file endpoint
**Service:** erp-service · `app/files/router.py:137,165,188,216,246`

Every lookup filters only by id/owner:

```python
stmt = select(FileRecord).where(FileRecord.id == body.file_id)          # confirm
stmt = select(FileRecord).where(FileRecord.id == file_id)               # get/download/delete
.where(FileRecord.owner_type == owner_type, FileRecord.owner_id == owner_id)  # list
```

`organization_id` is stored at upload time but never checked again. Any authenticated user of any tenant can enumerate ids to **download, confirm, or delete any other tenant's files**, including deleting objects from MinIO (`delete_file`).

**Fix:** Add `.where(FileRecord.organization_id == payload["organization_id"])` to all five handlers.

---

### C5. File attachment flow silently discards files end-to-end (frontend/backend contract break)
**Apps/services:** crm-ui + erp-shell modals ↔ crm-service

Phase 6 changed all modals to send `file_id` in create/update payloads. But:

1. **Generic CRUD whitelists columns** (`app/main.py` `create_entity`: `if k in mapper.columns`) — models now carry `file_uri` (Phase 4 rename), not `file_id`. The key doesn't match → **silently dropped**. Documents/sales/sales-orders never reference the uploaded file.
2. **Quotations**: `_map_crm_payload_to_billing` no longer reads any file field at all (removed in Phase 4), while `_build_quotation_out` reads `notes_dict.get("file_uri")` from notes JSON — which nothing ever writes anymore. Attachments to quotations are dropped entirely.
3. **DocumentCreateModal**: `existingFile` state is initialized/reset to `null` and never populated, so the `<FileViewer>` edit branch is dead UI.

Net effect: uploads consume MinIO storage and `file_records` rows, but **no business record ever links to them**.

**Fix:** Decide one contract — either backends accept `file_id` (resolve + store uri server-side via erp-service) or frontends send `file_uri`; update quotations mapper to persist `file_uri` into the notes JSON; populate `existingFile` from the record's file metadata when editing.

---

### C6. billing-service cannot fetch statement files from erp-service (no auth + wrong response shape)
**Service:** billing-service · `src/bank-reconciliation/bank-reconciliation.service.ts:24-37`

```ts
const response = await fetch(`${erpServiceUrl}/api/files/${fileId}/download`, {
  redirect: "follow",
});
...
const arrayBuffer = await response.arrayBuffer();
return this.processFileBuffer(organizationId, buffer, fileName);
```

Two independent defects:

1. No `Authorization` header forwarded → erp-service's `Depends(get_current_token_payload)` returns **401**, which throws as a raw `Error` (not `HttpException`) → opaque 500.
2. Even authenticated, `GET /api/files/:id/download` returns **JSON** `{"download_url": "<presigned>"}` — not bytes. `XLSX.read(jsonBuffer)` would fail regardless.

Also missing: timeout on `fetch`; error text leaks internal topology.

**Fix:** Forward the caller's JWT; parse JSON then fetch the presigned URL (or add an S2S streaming endpoint on erp-service).

---

### C7. Stop/prune scripts destroy database volumes
**Infrastructure:** `infrastructure/local/docker-build.ps1:44,57` and `docker-build.sh:29,42`

- `down` runs `compose down --volumes --remove-orphans`
- `prune` adds `--rmi all`

Running the ordinary "stop the stack" command **silently deletes `postgres_data` and `minio_data`** — every database and every stored file. There is no confirmation prompt and no `-KeepVolumes` option.

**Fix:** Default `down` to keep volumes; move destructive behavior behind an explicit `destroy` verb with confirmation.

---

## 2. HIGH Findings

### H1. Login timing attack + email enumeration
**core-iam** `src/auth/auth.service.ts:24-41` — unknown emails skip the bcrypt compare entirely (~100 ms difference) and return distinct messages ("No account found with this email address"). Constant-time dummy-hash compare + uniform "Invalid credentials" needed.

### H2. Refresh cookie hardcodes `secure: false`
**core-iam** `src/auth/auth.controller.ts:39-46` — no environment gating; in any HTTPS deployment the 7-day refresh token travels over plaintext HTTP.

### H3. Refresh rotation non-atomic, no reuse detection
**core-iam** `auth.service.ts:277-281` (revoke) and `:306-314` (create) are two statements without `$transaction`; reuse of a revoked token just 401s — no theft detection (should revoke all user tokens).

### H4. Open registration grants Organization Owner
**core-iam** `dto/register.dto.ts:16-18`, `register()` at `service:185,197` — any role string accepted; defaults to `'Organization Owner'` with a full org provisioned. Only login is rate-limited (`@Throttle` 5/min); registration is not.

### H5. Hardcoded invited-user password
**core-iam** `auth.service.ts:402` — `data.password || 'User@123!'`.

### H6. `SnakeCaseInterceptor` corrupts `Prisma.Decimal` values
**billing-service** `src/common/snake-case.interceptor.ts:13-25` — enumerates any non-Date object as a plain map. `Decimal` instances expose internal props `{s, e, d}` (verified empirically against this repo's Prisma client), so raw-model returns ship garbage money:
- `internal.service.ts:79,164,175`
- `revenue.service.ts:173-192` (`getContract`, `getSchedulesForPob`)
- `bank-reconciliation.service.ts:699` (tolerance rule upsert)

**Fix:** special-case Decimal (use `toJSON`/`toFixed`) or ban raw-model returns.

### H7. Global-unique document numbers vs per-org sequences
**billing-service** `prisma/schema.prisma:80,205` — `invoiceNumber @unique`, `quoteNumber @unique` are **global**, but `document-number.service.ts:22-46` computes MAX+1 scoped by `organization_id`. Tenant B's first invoice of a month collides with Tenant A's → `P2002` → 500. Same defect in **inventory-service**: `Product.sku`, `PurchaseOrder.order_number`, `PurchaseRequisition.pr_number`, `WorkOrder.work_order_no`. Conversely `creditNoteNumber`/`debitNoteNumber` have **no uniqueness at all**. MAX+1 also races within an org (computed outside the insert transaction).

### H8. Lost-update race on invoice `paidAmount`
**billing-service** `payments.service.ts:114-136` (`clearPayment`) and `:234-257` (`refund`):

```ts
const paidAmount = Number(invoice.paidAmount) + Number(payment.amount);
await tx.invoice.update({ data: { paidAmount: new Prisma.Decimal(paidAmount) ...
```

Plain RMW under READ COMMITTED — two concurrent payments lose an increment (invoice shows unpaid while cash was received). Credit notes share the pattern (`credit-notes.service.ts:71-97`).
**Fix:** `data: { paidAmount: { increment } }` or row locks.

### H9. Refunding pending/failed payments corrupts balances
**billing-service** `payments.service.ts:225-232` — guard only blocks `status === "refunded"`; refunding a **pending** payment subtracts money that was never added to `paidAmount` and posts AR ledger entries for funds never received.

### H10. Invoice deletion has no state guard and orphans payments
**billing-service** `invoices/invoices.service.ts:609-616` — no draft-only check; deleting a paid/partially-paid invoice cascades items while `Payment.invoiceId onDelete: SetNull` (schema:153) leaves orphaned payment records detached from posted journals.

### H11. Stock mutations are non-atomic (oversell / negative stock)
**inventory-service** `app/stock/services.py:85-100` (`adjust_stock`), `:156-179` (`record_movement`); same pattern in PO receipt (`purchase_order/services.py:223-242`) and dispatch (`fulfillment/services.py:298-310`):

```python
stock.quantity -= quantity    # no SELECT ... FOR UPDATE, no atomic UPDATE
```

Two concurrent outbound movements both pass availability checks → oversell.

### H12. Fulfillment reservation race + phantom reservations
**inventory-service** `app/fulfillment/services.py:201-221` — ATP check and `reserved_quantity +=` are separate unlocked steps (double-reserve); if no stock row exists the reservation is **silently skipped** yet the order still becomes `RESERVED`; no cap preventing `reserved > quantity`.

### H13. Events published before DB commit (phantom events)
- **inventory-service** `app/core/events.py:64-66` — fire-and-forget AMQP publish spawned immediately; commit happens later. Rollback ⇒ consumers still process e.g. `inventory.shipment.dispatched` ⇒ **billing invoices shipments that never happened**.
- **billing-service** publishes inside `$transaction` blocks (`invoices.service.ts:372,507`; `credit-notes.service.ts:141`; `payments.service.ts:166,203,290`) despite an existing-but-unused `OutboxRecord` table.

### H14. Event consumers default to organization 1
**billing-service** `invoices-consumer.controller.ts:20,115` and **inventory-service** `worker.py:20,147`:

```ts
const organizationId = Number(data.organization_id || 1);
```

Malformed/legacy events book financials into **tenant #1** — cross-tenant injection via the bus. Fail loudly instead.

### H15. Presigned URLs point at an endpoint browsers may not reach
**erp-service** `app/files/minio_client.py:22-27` + compose env — URLs are signed against `MINIO_ENDPOINT` (`localhost:9000` local / service-internal hostname in Docker). No nginx vhost exists for MinIO, so in containerized deployments every presigned URL is unroutable from a user's browser; locally it forces MinIO onto the developer's localhost. Also the sync `minio` client is invoked inside `async def` handlers (`router.py:145,195,224`) — **blocks the event loop** on every object stat/sign call.

---

## 3. MEDIUM Findings

### core-iam
| # | Finding | Location |
|---|---------|----------|
| M1 | Account-lockout DoS: 5 failures lock any account 15 min; counter increment is non-atomic | `auth.service.ts:44-53` |
| M2 | CORS subdomain wildcard `.*\.erp\.local` with credentials | `main.ts:33` |
| M3 | Deactivated users keep valid access tokens up to 15 min (stateless design, undocumented) | `getUserMe` etc. |
| M4 | Missing `@@unique([organizationId, userId])` on memberships — duplicate membership race; seed creates a fresh org per run and `generateAccessPayload` uses `findFirst` → non-deterministic role/org claims | `prisma/schema.prisma:132-148`, `seed.ts:130-139` |
| M5 | Missing `@@unique([roleId, permissionId])`; bcrypt cost 10 (prefer 12+) | schema:187-196 |

### billing-service
| # | Finding | Location |
|---|---------|----------|
| M6 | Manual `sent → paid` transition skips payment recording; `InvoicePaid` fires with `paymentId: 0`; dashboard revenue counts `sent` totals and ignores `partially_paid` — revenue/outstanding KPIs structurally wrong | `invoices.service.ts:450,516-527,634-644`; `payments.service.ts:325-331` |
| M7 | Recurring scheduler fabricates GST: `gstTreatment = tmpl.clientId % 2 === 0 ? "interstate" : "intrastate"`, rate hardcoded 18, no document-number assignment, no scheduler lock/idempotency (multi-instance = duplicate invoices) | `recurring-scheduler.service.ts:41-42` |
| M8 | Consumer idempotency is TOCTOU check-then-create; the P2002-suppression comment cites a “Unique (organization_id, po_reference)” constraint that **does not exist** (only an index) — catch branch dead, duplicates stand | `invoices-consumer.controller.ts:117-127,168-170` |
| M9 | Bank recon import swallows all errors returning HTTP 200 `{imported:0}`; row-by-row loop with no transaction (partial imports); `autoMatch` loads all org payments/invoices/ledger rows O(n×m); manual match writes ledger+update+audit untransactioned; float money math throughout | `bank-reconciliation.service.ts:135-138,109-124,197-215,487-512,595-619` |
| M10 | Payments lack guards: can pay draft/void invoices; overpayment flips to `paid` and clamps balance absorbing the excess; ledger writes silently skipped when accounts 1001/1002 absent | `payments.service.ts:19-29,138` |
| M11 | Currency schizophrenia: journals hardcoded `"USD"` while contract currency defaults `"INR"` | `invoices.service.ts:602`; schema:628 |
| M12 | No ThrottlerModule — entire service unthrottled behind gateway | — |

### inventory-service
| # | Finding | Location |
|---|---------|----------|
| M13 | `step_back(DISPATCHED→PACKED)` never restores deducted quantity/reserved — perpetual stock shrinkage via UI back-and-forth | `fulfillment/services.py:811-836` |
| M14 | Dispatch picks arbitrary warehouse row (`scalars().first()`) and records movement with negative quantity, contradicting `record_movement`'s positive-quantity contract | `fulfillment/services.py:305-306,318` vs `stock/services.py:150-151` |
| M15 | No `UniqueConstraint(org, product, warehouse)` on stock rows — find-or-create race splits stock permanently | `stock/models.py` |
| M16 | Worker acks poisoned messages after logging (no nack/DLQ/retry) | `worker.py:15-139` |
| M17 | Serial numbers lack uniqueness constraints entirely | `serial_number/models.py:17` |
| M18 | Shortage auto-provisioning invents supplier `supplier@vendor.com`, random warehouses, SKUs `SKU-{randint(1000,9999)}` — collides with global-unique SKU | `fulfillment/services.py:91-95,437-443,457-465` |
| M19 | Fire-and-forget `resume_pending_fulfillments` wrapped in bare `except Exception: pass` | `stock/services.py:137-138,194-195` |

### Frontend / packages
| # | Finding | Location |
|---|---------|----------|
| M20 | JWT passed as WebSocket query param — leaks into access/proxy logs | `ui-theme/src/components/ui/notification-provider.tsx:~96` |
| M21 | Notification REST base bypasses app proxies: defaults `http://localhost:8000`, compose sets no `NEXT_PUBLIC_ERP_API_URL` — notifications dead in Docker | same file `:40-42` + compose |
| M22 | crm-service CORS: `allow_origins=["*"]` with `allow_credentials=True` (invalid per spec; effectively no origin control) | `crm-service/app/main.py` |
| M23 | `FileViewer` anchor-tag download hits `/api/files/:id/download`, which returns **JSON**, not the file — downloads a `.json` blob named after the file | `file-viewer.tsx` + `router.py:180-200` (docstring says redirect; implementation returns JSON) |
| M24 | Pending `FileRecord`s created at upload-request are never expired/cleaned when clients abandon uploads (orphaned rows + eventual orphaned objects) | `router.py:92-106` |
| M25 | Migration script hardcodes `uploader_id=1`, `ORG_ID=1` and writes migrated URIs into the legacy `documents.files` column that migration `a2b3c4d5e6f7` then drops — order-sensitive and lossy if run post-migration | `crm-service/scripts/migrate_files_to_minio.py` |

---

## 4. LOW Findings

| # | Finding | Location |
|---|---------|----------|
| L1 | `$queryRawUnsafe` with interpolated identifiers (currently constant strings — landmine) | billing `document-number.service.ts:31-35` |
| L2 | Dev secrets committed across services: identical `JWT_SECRET=development-jwt-secret-key-123` (one leak compromises all five services), `postgres:root`, RabbitMQ `guest:guest` fallback | various `.env`/defaults |
| L3 | Hardcoded topology: `http://localhost:8000/8003` fallbacks in bank-recon, inventory config, notification provider | multiple |
| L4 | Billing `AuthGuard` never verifies token `type` claim (inventory does correctly) | billing `auth.guard.ts:41-44` |
| L5 | `delete_object` swallows all `S3Error`s — silent orphaned objects possible | erp `minio_client.py:88-94` |
| L6 | BaseRepository get/update/delete don't filter `organization_id` (safe today only because callers pre-scope) | inv `database.py:42-70` |
| L7 | No FK constraints on Stock/StockMovement/SerialNumber/Supplier/Warehouse — deletes leave orphans | inventory models |
| L8 | Dead models: `Invitation` (core-iam schema:169-185), `ReconciliationReport` (billing schema:330-347); NestJS scaffold `AppService.getHello()` | schemas |
| L9 | Unreachable `PaymentStatus` values (`failed`, `completed`) still counted/matched | billing schema:38-44, metrics, autoMatch |
| L10 | Raw `fetch` with manual Bearer in notification-provider duplicates auth logic, skips refresh-on-401 | notification-provider.tsx:79 |
| L11 | Similar revision IDs `a1b2c3d4e5f6` (lead fields) vs `a1b2c3d4e5f7` (file records) invite human confusion in migration chains | erp alembic versions |
| L12 | GEMINI/GROQ API keys present in local env files without rotation guidance | crm-service `.env.example` |

---

## 5. What Held Up Well

For balance — areas that audited clean:

- **inventory-service auth**: every router chains `Depends(get_current_org_id)`; token-type enforcement correct (`security.py:9-10`); Pydantic DTOs everywhere.
- **Validation pipes**: billing uses `forbidNonWhitelisted: true`; FastAPI/Pydantic contracts are solid.
- **JWT secret consistency**: all four services currently agree on the shared secret.
- **MinIO object keys**: `make_object_key` uses uuid4 prefixes — no collision risk.
- **Alembic chains**: both new migrations chain correctly off their respective heads (`d2e3f4a5b6c7`, `f5a6b7c8d9e0`).
- **Frontend**: zero `FileReader`/base64 remnants across all apps; proxies consistently route `/files/*` to erp-service (except the erp-shell prefix bug, C3).

---

## 6. Remediation Roadmap (priority order)

**Sprint 1 — security stopgaps (days)**
1. C1: deny-by-default PermissionsGuard + annotate all admin routes (core-iam).
2. C4: add `organization_id` scoping to all five file endpoints.
3. C7: fix docker-build scripts to preserve volumes.
4. H14/I8: remove `|| 1` org defaults in both event consumers.
5. H2/H5: gate cookie `secure` flag by env; remove default invite password.

**Sprint 2 — make the file pipeline actually work (week)**
6. C2: fix MIME regex.
7. C3: reconcile `/api` prefix convention between erp-shell proxy and files router.
8. C5: settle `file_id` vs `file_uri` contract; wire quotations mapper; fix DocumentCreateModal viewer branch.
9. C6: billing import-file-by-id — forward JWT + handle JSON/presigned two-step fetch.
10. M23/M24: download redirect or Content-Disposition handling; pending-record TTL cleanup.

**Sprint 3 — concurrency & money integrity (1–2 weeks)**
11. H8/H9: atomic `increment` for `paidAmount`; refund-state guard.
12. H11/H12/M15: `FOR UPDATE` / atomic UPDATE for stock; stock-row unique constraint; reservation caps.
13. H7: per-org unique constraints for all document numbers (+ sequence locking).
14. H13: outbox pattern (table already exists in billing) or publish-after-commit hooks.
15. H6: Decimal-safe interceptor.

**Sprint 4 — hygiene**
16. Auth hardening: uniform login errors (H1), rotation transaction + reuse detection (H3), registration lockdown (H4), lockout backoff (M1).
17. Schema cleanups: drop dead models, add membership/role-permission uniques (M4/M5), FK constraints (L7), serial uniqueness (M17).
18. Observability/config: DLQ for workers (M16), rate limiting on billing (M12), rotate committed dev secrets, externalize all inter-service URLs (L2/L3).
