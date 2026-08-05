import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.product.models import Product
from app.warehouse.models import Warehouse
from app.stock.models import Stock, StockMovement
from app.supplier.models import Supplier
from app.purchase_order.models import PurchaseOrder
from app.serial_number.models import SerialNumber


class InventoryDashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_kpis(self, organization_id: int) -> dict:
        total_products = await self._count(Product, organization_id)
        total_warehouses = await self._count(Warehouse, organization_id)
        total_suppliers = await self._count(Supplier, organization_id)

        low_stock_stmt = sa.select(sa.func.count()).select_from(Stock).where(
            Stock.organization_id == organization_id,
            Stock.quantity <= 10,
        )
        result = await self.db.execute(low_stock_stmt)
        low_stock_count = result.scalar() or 0

        total_stock_stmt = sa.select(sa.func.coalesce(sa.func.sum(Stock.quantity), 0)).where(
            Stock.organization_id == organization_id,
        )
        result = await self.db.execute(total_stock_stmt)
        total_stock = result.scalar() or 0

        pending_po_stmt = sa.select(sa.func.count()).select_from(PurchaseOrder).where(
            PurchaseOrder.organization_id == organization_id,
            PurchaseOrder.status.in_(["DRAFT", "SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED"]),
        )
        result = await self.db.execute(pending_po_stmt)
        pending_po_count = result.scalar() or 0

        return {
            "total_products": total_products,
            "total_warehouses": total_warehouses,
            "total_suppliers": total_suppliers,
            "total_stock_units": total_stock,
            "low_stock_count": low_stock_count,
            "pending_purchase_orders": pending_po_count,
        }

    async def get_low_stock_products(self, organization_id: int, limit: int = 10) -> list[dict]:
        stmt = sa.select(
            Stock.product_id,
            Stock.warehouse_id,
            Stock.quantity,
            Product.name,
            Product.sku,
            Product.low_stock_threshold,
        ).join(
            Product, Stock.product_id == Product.id,
        ).where(
            Stock.organization_id == organization_id,
            Stock.quantity <= Product.low_stock_threshold,
        ).limit(limit)
        result = await self.db.execute(stmt)
        return [
            {
                "product_id": r.product_id,
                "warehouse_id": r.warehouse_id,
                "product_name": r.name,
                "sku": r.sku,
                "current_stock": r.quantity,
                "threshold": r.low_stock_threshold,
            }
            for r in result.all()
        ]

    async def get_recent_movements(self, organization_id: int, limit: int = 10) -> list[dict]:
        stmt = sa.select(
            StockMovement.id,
            StockMovement.product_id,
            StockMovement.type,
            StockMovement.quantity,
            StockMovement.notes,
            StockMovement.created_at,
            Product.name.label("product_name"),
        ).join(
            Product, StockMovement.product_id == Product.id,
        ).where(
            StockMovement.organization_id == organization_id,
        ).order_by(
            StockMovement.created_at.desc(),
        ).limit(limit)
        result = await self.db.execute(stmt)
        return [
            {
                "id": r.id,
                "product_id": r.product_id,
                "product_name": r.product_name,
                "type": r.type,
                "quantity": r.quantity,
                "notes": r.notes,
                "created_at": r.created_at.isoformat(),
            }
            for r in result.all()
        ]

    async def get_warehouse_summary(self, organization_id: int) -> list[dict]:
        stmt = sa.select(
            Warehouse.id,
            Warehouse.name,
            Warehouse.code,
            sa.func.coalesce(sa.func.sum(Stock.quantity), 0).label("total_items"),
            sa.func.count(Stock.product_id).label("unique_products"),
        ).outerjoin(
            Stock, Warehouse.id == Stock.warehouse_id,
        ).where(
            Warehouse.organization_id == organization_id,
        ).group_by(
            Warehouse.id, Warehouse.name, Warehouse.code,
        )
        result = await self.db.execute(stmt)
        return [
            {
                "id": r.id,
                "name": r.name,
                "code": r.code,
                "total_items": r.total_items,
                "unique_products": r.unique_products,
            }
            for r in result.all()
        ]

    async def _count(self, model, organization_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(model).where(model.organization_id == organization_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
