# DATAVEX ERP — Progress & Audit Report

## Inventory UI Port to erp-shell — Complete

All inventory-ui pages have been ported to erp-shell with full CRUD modals, stock movements page, and fulfillment workflow pipeline.

---

## Architecture Blueprint Compliance

The 5-step fulfillment workflow maps to README.md blueprint steps I5→I10:

| Blueprint (README.md) | Implementation | Status |
|---|---|---|
| ATP Check (I1) | `QUEUED` → Check Stock action | ✅ |
| Hard Allocation / Reserve (I5) | `RESERVED` | ✅ |
| Pick List (I6) | `PICKING` | ✅ |
| Pack (I8) | `PACKED` | ✅ |
| Dispatch + Deduct Stock + Log Movement (I10) | `DISPATCHED` | ✅ |
| Generate Invoice → Billing (A1) | `COMPLETED` | ⚠️ See audit |
| Out-of-Stock → Create PO (Buy flow) | `SHORTAGE` → `PO_CREATED` | ✅ |

---

## Flow Route Integrity

```
Browser → erp-shell proxy.ts → erp-service inventory/router.py → inventory-service
```

All 14 passthrough endpoints in erp-service (`inventory/router.py:257-363`) match 1:1 with inventory-service (`fulfillment/router.py` prefix `/fulfillment`).

### CRUD Routes

| Resource | erp-service handler | Backend target |
|---|---|---|
| Products | `product/router.py` (prefix `/products`) | inventory-service :8004 |
| Warehouses | `inventory/router.py` `/warehouses` | inventory-service :8004 |
| Stock | `inventory/router.py` `/stock` | inventory-service :8004 |
| Stock Movements | `inventory/router.py` `/stock/movements` | inventory-service :8004 |
| Suppliers | `inventory/router.py` `/suppliers` | inventory-service :8004 |
| Purchase Orders | `inventory/router.py` `/purchase-orders` | inventory-service :8004 |
| Serial Numbers | `inventory/router.py` `/serial-numbers` | inventory-service :8004 |
| Fulfillment | `inventory/router.py` `/fulfillment/orders*` | inventory-service :8004 |

---

## Cross-Module Integration Audit

### Inventory → Billing (Invoice on Dispatch)

- **Documented:** Kafka event `Shipment.Dispatched` triggers auto-invoice in billing
- **Implemented:** Synchronous `POST http://localhost:8003/api/invoices` from `fulfillment/services.py:329`
- **Issues:**
  - Calls generic `POST /api/invoices` instead of dedicated `POST /api/invoices/from-dispatch`
  - Bypasses erp-service gateway (direct call to billing-service :8003)
  - Kafka not yet deployed — sync REST is correct interim approach

### Inventory → Procurement (PO on Shortage)

- Auto-creates PurchaseOrder with auto-selected/auto-created supplier
- Skips Purchase Requisition step (acceptable simplification for current phase)
- PO status set to `ORDERED` directly

### Dashboard — Missing Fulfillment KPIs

- `erp-service/dashboard/inventory` returns products/stock/suppliers/PO stats only
- No fulfillment pipeline KPIs exposed through the aggregated dashboard
- Fulfillment KPIs only visible on the `/inventory/fulfillment` page itself

### COGS Tracking

- Dispatch correctly deducts stock and logs StockMovement with `type="out"`
- COGS expense auto-recognition in accounting module **not implemented**

---

## Issues Found

### Critical

1. **Missing Alembic migration for fulfillment tables**
   - `sales_order_fulfillments` and `fulfillment_items` models exist in `services/inventory-service/app/fulfillment/models.py`
   - No migration in `alembic/versions/` — `alembic upgrade head` will NOT create these tables
   - Runtime will fail with `relation "sales_order_fulfillments" does not exist`

### Medium

2. **Wrong invoice creation endpoint**
   - `generate_invoice_link()` at `services/inventory-service/app/fulfillment/services.py:329`
   - Calls `POST /api/invoices` (generic create)
   - Should call `POST /api/invoices/from-dispatch` (purpose-built for fulfillment dispatch)

3. **Cross-module call bypasses gateway**
   - `POST http://localhost:8003/api/invoices` — direct call to billing-service port
   - Should route through erp-service at `http://localhost:8000/api/invoices/from-dispatch`
   - Breaking change if erp-service adds transformation/auth logic later

### Low

4. **No fulfillment KPIs in erp-service dashboard aggregation**
   - `/dashboard/inventory` doesn't include fulfillment pipeline stats
   - Exec dashboard doesn't show queue/reserved/dispatch counts

5. **COGS auto-recognition not triggered on dispatch**
   - Accounting module doesn't receive dispatch events

---

## Inventory Pages Ported (12 total)

| Page | Route | Status |
|---|---|---|
| Products | `/inventory/products` | ✅ Full CRUD (create/edit/delete modals) |
| Warehouses | `/inventory/warehouses` | ✅ Full CRUD |
| Suppliers | `/inventory/suppliers` | ✅ Full CRUD |
| Purchase Orders | `/inventory/purchase-orders` | ✅ Full CRUD + line items + status transitions |
| Serial Numbers | `/inventory/serials` | ✅ Full CRUD |
| Stock Levels | `/inventory/stock` | ✅ Real stock levels + KPI cards + adjust modal + order history |
| Stock Movements | `/inventory/stock/movements` | ✅ New page |
| Fulfillment | `/inventory/fulfillment` | ✅ Full pipeline + workflow modal |
| Stock Adjustments | `/inventory/stock/adjustments` | ⚠️ Placeholder page (pre-existing) |

### Files Created/Modified

```
apps/erp-shell/types/inventory.ts                              — Added ApiStockLevel, ApiFulfillment, ApiFulfillmentItem
apps/erp-shell/utils/format.ts                                 — Added number() formatter
apps/erp-shell/components/Sidebar.tsx                           — Added Stock Movements + Fulfillment entries
apps/erp-shell/components/FulfillmentWorkflowModal.tsx          — NEW 5-step workflow modal (357 lines)
apps/erp-shell/app/(admin)/inventory/stock/page.tsx             — Rewritten with real stock levels
apps/erp-shell/app/(admin)/inventory/stock/movements/page.tsx   — NEW
apps/erp-shell/app/(admin)/inventory/stock/movements/loading.tsx — NEW
apps/erp-shell/app/(admin)/inventory/fulfillment/page.tsx       — NEW
apps/erp-shell/app/(admin)/inventory/fulfillment/loading.tsx    — NEW
apps/erp-shell/app/(admin)/inventory/products/page.tsx          — Added CRUD modals
apps/erp-shell/app/(admin)/inventory/warehouses/page.tsx        — Added CRUD modals
apps/erp-shell/app/(admin)/inventory/suppliers/page.tsx         — Added CRUD modals
apps/erp-shell/app/(admin)/inventory/purchase-orders/page.tsx   — Added CRUD modals
apps/erp-shell/app/(admin)/inventory/serials/page.tsx           — Added CRUD modals
services/erp-service/app/integrations/inventory_client.py        — Added 11 fulfillment functions
services/erp-service/app/inventory/router.py                     — Added 14 fulfillment passthrough endpoints
```
