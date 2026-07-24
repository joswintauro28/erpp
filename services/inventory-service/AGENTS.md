# DATAVEX ERP — Inventory Service (`services/inventory-service`) Agent Context

This backend service manages the product catalog, warehouses, stock levels, suppliers, purchase orders, and serial tracking.

## 1. Tech Stack
- **Framework:** FastAPI (Python 3.13+)
- **Database ORM:** SQLAlchemy 2.0 (AsyncSession via `postgresql+asyncpg`)
- **Database Migrations:** Alembic
- **Database Target:** `erp_inventory` (PostgreSQL)
- **Port:** 8004

## 2. API Design & Patterns
- **Auth Pattern:** Claims-based JWT validation using the shared `JWT_SECRET` (no DB lookup for authentication).
- **Data Isolation:** All models contain an `owner_id` field to partition data per organization.
- **Models:** Product, Warehouse, Stock, StockMovement, Supplier, PurchaseOrder (with PurchaseOrderItem), SerialNumber.
- **Interactive OpenAPI Documentation:** Exposes Swagger UI (`http://localhost:8004/docs`), ReDoc (`http://localhost:8004/redoc`), and OpenAPI spec (`http://localhost:8004/openapi.json`) with Bearer JWT authorization.

## 3. Key Modules
- **Products:** SKU, pricing, tax rates, batch/serial flags.
- **Warehouses:** Code, address, city/state locator.
- **Stock & Movements:** Inventory adjustments auto-log to StockMovement.
- **Purchase Orders:** Standard lifecycle (draft -> ordered -> received) with auto-totaling.
- **Serial Numbers:** Serial tracking per product×warehouse.

## 4. Run & Deployment Commands
- **Run Service:**
  ```bash
  bun nx run inventory-service:dev
  ```
- **Alembic Migrations:**
  ```bash
  .venv\Scripts\alembic upgrade head
  ```
