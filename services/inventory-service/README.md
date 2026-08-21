# inventory-service — Inventory and Warehouse Logistics Service

The Inventory Service is a modular FastAPI service running on **port 8004**, managing product catalogs, warehouse locations, stock levels, adjustments logs, and procurement purchase orders.

---

## 1. Tech Stack
- **Framework**: FastAPI (Python 3.13+)
- **Database ORM**: SQLAlchemy 2.0 (AsyncSession via `postgresql+asyncpg` driver)
- **Migrations**: Alembic
- **Database Target**: `erp_inventory` (PostgreSQL)

---

## 2. API Endpoints
- `/products`: Product catalog CRUD
- `/warehouses`: Location structures CRUD
- `/stock`: Combined stock view per warehouse×product
- `/stock/movements`: Stock adjustments in/out logs
- `/purchase-orders`: Procurement PO lifecycle (draft &rarr; ordered &rarr; received)
- `/serial-numbers`: Tracking lists for serial numbers

---

## 3. Run Scripts
- Dev Server: `bun nx run inventory-service:dev` (runs on `http://localhost:8004`)
- Migrations: `alembic upgrade head`
- Docker: Builds via services/inventory-service/Dockerfile (slim Python builder, isolated `/opt/venv` environment, non-root user, automated Alembic migrations on startup).
