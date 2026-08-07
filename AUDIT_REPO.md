# DATAVEX ERP — Inter-Module Communication Audit (REST & RabbitMQ)

**Scope:** Cross-service REST integration, RabbitMQ event wiring (publishers → routing keys → consumers), payload/envelope compatibility, JWT/secret consistency, and frontend → gateway proxy paths across **CRM (8001), Inventory (8004), Billing (8003), ERP Gateway (8000), Core-IAM (8002)**.

**Reference docs:** `docs/PROJECT.md` (SSO / DB-per-service / aggregation), `README.md` (technical blueprint: Order.Approved → ATP → Fulfillment → Shipment.Dispatched → Invoice/COGS, PurchaseOrder.Created → AP).

**Method:** Static code audit of every `publish_event` / `exchange.publish` / `EventPattern` / `declare_queue` site, every inter-service HTTP client, the Next.js `proxy.ts` files, `docker-compose.yml` env wiring, and `.env` JWT secrets. All line references are to the current working tree.

---

## 1. Executive Summary

The core pipeline **is wired and functionally complete**: SO approval → inventory fulfillment → dispatch → auto-invoice/COGS → payment → CRM status sync all flow over the shared `erp_events` topic exchange, and the JWT secret is consistent across all 5 services. The previous session's fixes (SO cancellation events, `billing.invoice.created` → SO "Invoiced", `invoice.paid` → SO "Paid", monotonic SO status, `salesOrderCode` invoice linkage, idempotent dispatch consumer) are present and correct.

The audit initially found **3 high-severity defects** that produce wrong or lost financial data, **2 Docker-only breakages** from hardcoded `localhost` URLs, and a set of **dead/unconsumed events and broken gateway paths**. The most important: **every PO that reached APPROVED created two Accounts-Payable invoices** (once via RabbitMQ `inventory.po.created`, once via REST `trigger-vendor-bill`).

**Status update (this session):** H1, H6, M1, and M7 are **fixed and validated** — AP creation is now single-path (RabbitMQ only) with a `poReference`-keyed idempotency guard + partial unique index, the inventory→billing URL is env-configurable, `generate_invoice_link` sends a camelCase payload with `salesOrderCode`, and the internal billing endpoints are guarded and org-scoped. The remaining open items are H2/H3/H4/H5/M10 (gateway paths, retry/DLQ) and M2–M9 (payload enrichment, dead code, envelope, docs).

---

## 2. Verified Working — RabbitMQ Event Matrix

Exchange: **`erp_events`** (topic, durable) — consistently declared by CRM, Inventory, Billing (`amqplib` + NestJS RMQ microservice) and the ERP workers.

| # | Routing Key | Publisher | Consumer(s) | Verified |
|---|-------------|-----------|-------------|----------|
| 1 | `crm.order.approved` | CRM `sales_orders/pipeline.py` | Inventory `crm_order_approved_queue` → creates fulfillment, ATP, auto-reserve/auto-PO | ✅ flat payload matches |
| 2 | `crm.order.cancelled` | CRM `sales_orders/pipeline.py` | Inventory `crm_order_cancelled_queue` → `cancel_fulfillment` (release stock, cancel PO, tombstone) | ✅ |
| 3 | `crm.quotation.sent` | CRM `quotations/router.py` | ERP notifications `unified_notifications_queue` | ✅ envelope matches |
| 4 | `inventory.order.shortage` | Inventory `core/worker.py` | CRM `inventory_shortage_crm_queue` → SO "Stock Hold" | ✅ |
| 5 | `inventory.order.reserved / picking / packed / fulfilled` | Inventory `fulfillment/services.py` | CRM `inventory_fulfillment_status_crm_queue` → SO status sync (monotonic) | ✅ |
| 6 | `inventory.shipment.dispatched` | Inventory `fulfillment/services.py` | Billing `shipment_dispatched_billing_queue` (auto-invoice + COGS), ERP `shipment_dispatched_cogs_queue`, CRM (SO "Delivered") | ✅ |
| 7 | `inventory.po.created` | Inventory `purchase_order/services.py` + `fulfillment/services.py` | Billing `po_created_ap_queue` → AP invoice (single path, `poReference`-idempotent) | ✅ (H1 fixed) |
| 8 | `inventory.order.fulfillment` (shortage summary) | CRM `sales_orders/pipeline.py` | ERP notifications | ✅ envelope matches |
| 9 | `billing.invoice.created` | Billing `event-bus/event-bus.service.ts` | CRM `invoice_created_crm_queue` → SO "Invoiced" (via `salesOrderCode`) | ✅ (fixed this session) |
| 10 | `billing.invoice.paid` | Billing `invoices.service.ts` / `payments.service.ts` | CRM `invoice_paid_crm_queue` → SO "Paid" + opp Won + tier, and ERP notifications | ✅ (SO-Paid fixed this session) |
| 11 | `billing.invoice.sent / billing.invoice.overdue` | Billing `event-bus.service.ts` | ERP notifications | ✅ |

**JWT secret consistency:** `JWT_SECRET=development-jwt-secret-key-123` verified identical in the `.env` of all 5 services and as the Compose default. ✅

---

## 3. Verified Working — REST Integration

| Caller | Endpoint | Verified |
|--------|----------|----------|
| CRM → Billing | `GET /api/invoices/credit-check` (credit check on SO approval) | ✅ exists (`invoices.controller.ts`) |
| CRM → Inventory | `POST /stock/check` (ATP check) | ✅ exists (`stock/router.py`) |
| Inventory → Billing | `POST /api/internal/billing/trigger-vendor-bill` (guarded, idempotent fallback) | ✅ exists (`internal.controller.ts`, now `AuthGuard`+`PermissionsGuard` + org from JWT) — no longer auto-called by inventory |
| ERP → Billing | ~40 endpoints: invoices (+`/from-dispatch`), quotations, credit/debit notes, recurring, payments (+`/metrics`), `/dashboard/billing`, `/accounts`, `/expenses` (+`/from-po`), `/ledger`, `/reports`, `/aging`, `/dunning`, `/bank-reconciliation/*`, `/periods/*`, `/reports/cogs/*` | ✅ all target routes exist — except H5 |
| ERP → Inventory | products, warehouses, stock (+`/adjust`, `/check`), movements, suppliers, POs, serials, fulfillment workflow, `/dashboard/inventory*` | ✅ |
| ERP → CRM | generic entity CRUD via `/crm/{entity}` passthrough, leads, opportunities, AI, lead-discovery | ✅ except H3 (quotations) |

**Frontend proxies:** `crm-ui` (strips `/v1`, `/crm`; `/api/auth` → IAM, rest → CRM `/api`), `billing-ui` (→ billing `/api`), `inventory-ui` (→ inventory, no prefix) all correctly match their backends. `erp-shell` correctly funnels everything except `/api/auth` through the ERP gateway (8000), matching PROJECT.md's API-Aggregation (Option A) pattern.

---

## 4. Findings

### 🔴 High

**H1 — Duplicate Accounts-Payable invoices for every approved PO. — ✅ FIXED**
`inventory.po.created` is published on PO creation (`purchase_order/services.py:121`, `fulfillment/services.py` auto-PO) and consumed by Billing's `handlePoCreated`, which creates a payable invoice. Previously, `purchase_order/router.py:_trigger_ap_bill` ALSO POSTed to `/api/internal/billing/trigger-vendor-bill` when a PO became `APPROVED`, creating a **second** payable invoice.

*Fix applied:* the REST AP path was **removed** (`_trigger_ap_bill` deleted from `purchase_order/router.py`; the dead `trigger_vendor_bill` helper trimmed from `core/billing_client.py`). RabbitMQ `inventory.po.created` is now the **single AP path**, made idempotent by:
- `Invoice.poReference` column (Prisma schema + DTO + `findByPoReference` in `invoices.service.ts`);
- a check-then-create guard plus **P2002 race suppression** in both `handlePoCreated` (`invoices-consumer.controller.ts`) and `InternalService.createVendorBill` (wrapped in `$transaction`);
- a **partial unique index** `(organization_id, po_reference) WHERE type = 'payable'` on `erp_billing` (verified no pre-existing duplicates before creating it).

**H2 — erp-shell CRM entity calls hit non-existent gateway routes.**
The shell mutations use un-prefixed paths that do not exist on the ERP gateway (they resolve only under `/crm/...`): `/customers`, `/sales-orders`, `/quotations`, `/requirements`, `/sales`, `/opportunities`, `/documents`, `/contacts`, `/reports`, `/leads` → `http://localhost:8000/<path>` → **404**. Examples: `apps/erp-shell/components/GenericDetailsModal.tsx` (POST `/customers`, `/sales-orders`, `/quotations`, `/requirements`, `/sales`), `apps/erp-shell/app/(admin)/crm/customers/page.tsx:36` (DELETE `/customers/...`), `.../crm/sales-orders/page.tsx:36`, `.../crm/quotations/page.tsx:38`, `.../crm/opportunities/page.tsx:36`, `.../crm/documents/page.tsx:36`, `.../crm/contacts/page.tsx:36`, `.../crm/reports/page.tsx:52`. Some pages correctly use `/crm/...` (e.g. `crm/leads/page.tsx:39`), so the shell is inconsistent. *Fix: normalize all CRM calls to the `/crm/...` gateway prefix (or expose root-level entity passthroughs).*

**H3 — `/crm/quotations` passthrough hardcodes an empty payload.**
`services/erp-service/app/crm/router.py` (`list_entities`) returns `{"summary": ..., "quotations": []}` for `entity_type == "quotations"` — the gateway never forwards quotation data. Combined with H2, the shell's quotations module is entirely non-functional. *Fix: forward to `billing_client.get_quotations` (billing `/invoices/quotations`) or the CRM quotations router.*

**H4 — Silent event/AP failure loss in consumers.**
Every RabbitMQ handler (CRM `worker.py`, Inventory `worker.py`, ERP `notifications_consumer.py` / `cogs_consumer.py`, Billing `invoices-consumer.controller.ts`) wraps its work in `try/except` and only logs; `message.process()` then **acks** the message. A poisoned or failed event is dropped with no retry, no dead-letter queue, and no audit trail. COGS has inbox idempotency (`cogs-accounting.service.ts`) but failures still never retry. Combined with H1, the financial ledger can silently diverge. *Fix: add a retry/DLQ policy (bounded requeue or persist failures) and surface failures to the ERP notification feed.*

**H5 — `reopen_period` 404.** ERP `billing_client.reopen_period` POSTs `/periods/{id}/reopen`, but Billing's `month-end-close.controller.ts` only exposes `/periods/{id}/reopen-request` and `/reopen-requests/{id}/approve`. The gateway route (and the accounting UI's reopen action) 404s. *Fix: map `reopen_period` to the existing `/reopen-request` endpoint or add `/periods/:id/reopen`.*

### 🔴 High (Docker-only breakages — hardcoded `localhost`)

**H6 — Inventory → Billing REST is hardcoded to `localhost:8003`. — ✅ FIXED**
`services/inventory-service/app/core/billing_client.py:5` previously set `BILLING_SERVICE_URL = "http://localhost:8003/api"` (a constant; no env), and `generate_invoice_link` in `fulfillment/services.py` posted to `http://localhost:8003/api/invoices` directly. Inside Docker Compose, `localhost` is the container itself → both calls failed.

*Fix applied:* `BILLING_SERVICE_URL` now reads from `settings.BILLING_SERVICE_URL` (env `BILLING_SERVICE_URL`, default `http://localhost:8003`, overridable in Compose to `http://billing-service:8003`), and `generate_invoice_link` uses `settings.BILLING_SERVICE_URL` (see M1).

### 🟡 Medium

**M1 — "Generate invoice" fulfillment path doesn't link the SO. — ✅ FIXED**
*Fix applied:* `generate_invoice_link` now posts a **camelCase** payload (`clientName`, `salesOrderCode`, `productId`, `description`, `quantity`, `unitPrice`, `gstRate`) that satisfies Billing's `ValidationPipe({ whitelist, forbidNonWhitelisted })` and `CreateInvoiceDto`/`CreateInvoiceItemDto` (the previous snake_case payload with a missing required `gstRate` would have 400'd), using the env-configurable URL (H6). The created invoice now carries `salesOrderCode` so the CRM worker can advance the SO to "Invoiced"/"Paid".

**M2 — `inventory.po.created` lacks `supplier_name`.** The AP invoice's `vendorName` defaults to "Default Supplier" (`invoices-consumer.controller.ts`). *Fix: include `supplier_name` in the PO event payload.*

**M3 — 11 routing keys are published with zero consumers.** `billing.invoice.updated`, `billing.payment.recorded`, `billing.credit_note.issued`, `billing.debit_note.issued`, `billing.expense.created`, `inventory.po.approved`, `inventory.po.received`, `inventory.stock.adjusted`, `inventory.serial.updated`, `inventory.supplier.status_changed`, `inventory.order.cancelled`. These are PROJECT.md "Option B" analytics/notification events with no subscriber yet — not harmful, but they give a false sense of coverage. *Fix: either subscribe (notifications feed, read-model) or stop publishing.*

**M4 — Dead HTTP webhooks.** `erp-service/app/events/router.py` exposes `/api/events/billing/invoice-created|payment-recorded|note-issued|expense-created`, but nothing POSTs to them (Billing publishes via RabbitMQ). Dead code.

**M5 — No shared event-envelope contract.** CRM→Inventory events are flat (`organization_id`, `sales_order_code`, ... at top level); CRM→ERP-notification and all Billing events use `{event, organization_id, payload, timestamp}` with camelCase payload keys. Every consumer matches its own publisher today, but the two shapes make cross-consumer reuse error-prone (the CRM worker must read both). *Fix: standardize on one envelope (recommend the `{event, organization_id, payload, timestamp}` wrapper).*

**M6 — Duplicated/ambiguous COGS responsibility.** ERP `cogs_consumer.py` computes totals and logs "COGS LEDGER RECOGNITION" but writes nothing; real COGS postings live in Billing (`cogs-accounting.service.ts`). Two services "owning" COGS invites divergence. *Fix: retire the ERP logger consumer or turn it into a real read-model subscriber.*

**M7 — Billing `/api/internal/billing/*` is unauthenticated. — ✅ FIXED**
*Fix applied:* `internal.controller.ts` now applies `@UseGuards(AuthGuard, PermissionsGuard)` at the controller level with `@Permissions("invoices.create")` per route, and the `organizationId` is taken exclusively from the authenticated JWT (`user.organization_id`), never trusted from the request body. Verified no remaining callers depend on the old unauthenticated contract (the inventory REST AP path was removed in H1).

**M8 — `core-iam` receives `RABBITMQ_URL` in Compose but uses no RabbitMQ.** Inert config.

**M9 — Docs vs code:** `AGENTS.md` §2.1 describes an erp-shell proxy that routes `/api/invoices*`, `/api/products*` etc. directly to 8003/8004; the actual `proxy.ts` routes everything (except `/api/auth`) to the 8000 gateway. The gateway design is correct per PROJECT.md; the docs are stale.

**M10 — Frontend gateway 404s:** `apps/erp-shell/app/(admin)/accounting/reconciliation/page.tsx` calls `/bank-reconciliation/unmatch` and `/bank-reconciliation/config`, which the ERP passthrough does not expose (only import/transactions/match/reports).

### 🟢 Low / Notes

- **N1 — Envelope payload casing:** billing events carry camelCase (`salesOrderCode`, `clientName`) while inventory/CRM events carry snake_case. Handled by per-consumer fallbacks, but see M5.
- **N2 — RabbitMQ default creds `guest/guest` and no vhost isolation** in `docker-compose.yml` (acceptable for local sandbox only).
- **N3 — `inventory.po.created` from `create_purchase_order` uses generic `product_name: f"Product {id}"`** — AP line descriptions are unhelpful for manually created POs.
- **N4 — erp-service `/crm` lead mapping assumes CRM field names** (`company`, `est_value`, `updated_at`); spot-check against the CRM `Lead` model when touching lead flows.
- **N5 — Dispatch-created invoices are created as `draft`** (not `sent`); CRM advances the SO to "Invoiced" on `invoice.created` regardless of invoice status — acceptable, but note the invoice must be sent manually to start dunning.

---

## 5. Previously Resolved

### This session — audit fixes (H1 / H6 / M1 / M7)

- **H1** — single AP path: REST `_trigger_ap_bill` removed; `inventory.po.created` (RabbitMQ) is the only AP creator, guarded by `poReference` idempotency (`findByPoReference` + P2002 suppression) and a partial unique index `(organization_id, po_reference) WHERE type = 'payable'` on `erp_billing`.
- **H6** — inventory→billing URL env-configurable via `settings.BILLING_SERVICE_URL` (Compose: `http://billing-service:8003`); dead `trigger_vendor_bill` helper removed.
- **M1** — `generate_invoice_link` posts camelCase payload with `salesOrderCode` + required `gstRate`, so the invoice links back to the SO (and passes whitelist validation).
- **M7** — internal billing endpoints guarded (`AuthGuard` + `PermissionsGuard`, `invoices.create`) with org scoped from the JWT.

*Validated:* Prisma schema validates/generates, billing `tsc --noEmit` clean, inventory Python compiles + venv imports OK, `po_reference` column applied additively to `erp_billing`.

### This session — SO → fulfillment ingestion completeness (all stock cases)

- **`check_sales_order_stock` now ALWAYS publishes `crm.order.approved`** (`sales_orders/router.py`): available stock → fulfillment created + auto-reserved; shortage → Stock Hold + fulfillment + auto-PO. Previously the endpoint only ingested on shortage, so an approved SO with available stock never entered the fulfillment queue.
- **Inventory `FulfillmentCreate.sales_order_code` pattern relaxed** (`fulfillment/schemas.py` → `CODE_ACCEPT_RE`): legacy/manual codes such as `SO-20260001` (the old UI placeholder format) are now accepted instead of being silently dropped by the worker (which acks even on validation failure).
- **Convert-modal SO-number placeholders updated** in `crm-ui` + `erp-shell` to the canonical `SO-YYYYMM-NNNN` format.

*Validated live against the Docker stack:* bare `check-stock` with available stock → fulfillment `RESERVED`; with shortage → `Stock Hold` + `PO_CREATED` (regression-safe); legacy code `SO-20260001` → `RESERVED`. All test rows were removed afterward.

### Last session — SO lifecycle pipeline

- `crm.order.cancelled` publish + inventory `cancel_fulfillment` (stock release, PO cancel, tombstone race guard).
- `billing.invoice.created` consumed → SO "Invoiced"; `billing.invoice.paid` → SO "Paid"; monotonic SO status advancement in `crm-service/app/core/worker.py`.
- `salesOrderCode` added to Invoice model (Prisma + manual additive ALTER on `erp_billing` — full `prisma db push` is still blocked by pre-existing `quotations` schema drift), DTO, and created/paid event payloads.
- Dispatch-consumer idempotency (duplicate invoice prevention) with COGS retry preserved via the inbox key.
- Quote→SO conversion now runs the full approval pipeline with line items.
- Generic CRUD (`main.py`) triggers the approval/cancellation lifecycle for sales-orders.

---

## 6. Recommended Fix Order

1. ~~**H1** — dedupe AP creation~~ ✅ done
2. ~~**H6/M1** — env-config inventory→billing URL + pass `sales_order_code` on generate-invoice~~ ✅ done
3. ~~**M7** — guard the internal billing endpoints~~ ✅ done
4. **H4** — retry/DLQ + failure surfacing for RabbitMQ consumers.
5. **H2/H3/H5/M10** — gateway route fixes (shell entity prefixes, quotations passthrough, period reopen, bank-recon endpoints).
6. **M2–M9** — payload enrichment, dead-code removal, envelope standardization, doc updates.

---

## 7. Audit Summary

| Area | Status |
|------|--------|
| JWT secret consistency (5 services) | ✅ |
| SO → fulfillment → dispatch → invoice/COGS → payment event chain | ✅ (after last session) |
| SO → fulfillment ingestion for ALL stock cases (available + shortage + legacy codes) | ✅ fixed this session |
| SO cancellation lifecycle (CRM ↔ Inventory) | ✅ |
| Credit check / ATP check REST calls | ✅ |
| ERP gateway aggregation (billing/inventory/CRM clients) | ✅ (except H3, H5) |
| Frontend proxies (all 4 apps) | ✅ (except shell entity paths H2/M10) |
| Financial integrity (AP dedup, idempotency) | ✅ H1 fixed (retries still open: H4) |
| Docker parity (no hardcoded localhost) | ✅ H6 fixed |
| Internal endpoint security | ✅ M7 fixed |

**Overall:** the event-driven backbone is real and mostly correct; the risk concentrates in **duplicate AP postings**, **silent consumer failures**, and **gateway path drift between the shell UI and the ERP aggregation layer**.
