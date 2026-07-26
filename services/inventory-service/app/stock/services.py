import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import HTTPException

from app.stock.models import Stock, StockMovement
from app.core.database import BaseRepository


from app.product.models import Product
from app.warehouse.models import Warehouse


class StockRepository(BaseRepository[Stock]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Stock)


class StockMovementRepository(BaseRepository[StockMovement]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, StockMovement)


class StockService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.stock_repo = StockRepository(db)
        self.movement_repo = StockMovementRepository(db)

    async def get_stock(self, organization_id: int, product_id: int | None = None, warehouse_id: int | None = None) -> list[dict]:
        stmt = (
            sa.select(
                Stock.id,
                Stock.organization_id,
                Stock.product_id,
                Stock.warehouse_id,
                Stock.quantity,
                Stock.reserved_quantity,
                Stock.created_at,
                Stock.updated_at,
                Product.name.label("product_name"),
                Product.sku.label("sku"),
                Warehouse.name.label("warehouse_name"),
            )
            .outerjoin(Product, Product.id == Stock.product_id)
            .outerjoin(Warehouse, Warehouse.id == Stock.warehouse_id)
            .where(Stock.organization_id == organization_id)
        )
        if product_id:
            stmt = stmt.where(Stock.product_id == product_id)
        if warehouse_id:
            stmt = stmt.where(Stock.warehouse_id == warehouse_id)
        result = await self.db.execute(stmt)
        return [dict(r._mapping) for r in result.all()]

    async def adjust_stock(self, organization_id: int, product_id: int, warehouse_id: int, new_quantity: int, notes: str | None = None) -> Stock:
        stmt = sa.select(Stock).where(
            Stock.organization_id == organization_id,
            Stock.product_id == product_id,
            Stock.warehouse_id == warehouse_id,
        )
        result = await self.db.execute(stmt)
        stock = result.scalar_one_or_none()

        if stock:
            old_qty = stock.quantity
            stock.quantity = new_quantity
        else:
            old_qty = 0
            stock = Stock(organization_id=organization_id, product_id=product_id, warehouse_id=warehouse_id, quantity=new_quantity)
            self.db.add(stock)

        await self.db.flush()

        movement = StockMovement(
            organization_id=organization_id,
            product_id=product_id,
            warehouse_id=warehouse_id,
            type="adjustment",
            quantity=new_quantity - old_qty,
            notes=notes,
        )
        self.db.add(movement)
        await self.db.flush()

        return stock

    async def record_movement(self, organization_id: int, **data) -> StockMovement:
        product_id = data["product_id"]
        warehouse_id = data["warehouse_id"]
        quantity = data["quantity"]
        movement_type = data["type"]

        stmt = sa.select(Stock).where(
            Stock.organization_id == organization_id,
            Stock.product_id == product_id,
            Stock.warehouse_id == warehouse_id,
        )
        result = await self.db.execute(stmt)
        stock = result.scalar_one_or_none()

        if stock:
            if movement_type == "in":
                stock.quantity += quantity
            elif movement_type == "out":
                stock.quantity -= quantity
        else:
            if movement_type == "in":
                stock = Stock(organization_id=organization_id, product_id=product_id, warehouse_id=warehouse_id, quantity=quantity)
                self.db.add(stock)
            elif movement_type == "out":
                raise HTTPException(status_code=400, detail="Cannot record out movement: no stock exists")

        await self.db.flush()

        movement = StockMovement(organization_id=organization_id, **data)
        self.db.add(movement)
        await self.db.flush()

        return movement

    async def get_movements(self, organization_id: int, product_id: int | None = None, limit: int = 50) -> list[dict]:
        stmt = (
            sa.select(
                StockMovement.id,
                StockMovement.organization_id,
                StockMovement.product_id,
                StockMovement.warehouse_id,
                StockMovement.type,
                StockMovement.quantity,
                StockMovement.reference_type,
                StockMovement.reference_id,
                StockMovement.notes,
                StockMovement.created_at,
                Product.name.label("product_name"),
                Product.sku.label("sku"),
                Warehouse.name.label("warehouse_name"),
            )
            .outerjoin(Product, Product.id == StockMovement.product_id)
            .outerjoin(Warehouse, Warehouse.id == StockMovement.warehouse_id)
            .where(StockMovement.organization_id == organization_id)
            .order_by(StockMovement.created_at.desc())
            .limit(limit)
        )
        if product_id:
            stmt = stmt.where(StockMovement.product_id == product_id)
        result = await self.db.execute(stmt)
        return [dict(r._mapping) for r in result.all()]

    async def count_low_stock(self, organization_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(Stock).where(Stock.organization_id == organization_id, Stock.quantity <= 10)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
