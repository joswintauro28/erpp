import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.stock.models import Stock, StockMovement
from app.core.database import BaseRepository


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

    async def get_stock(self, owner_id: int, product_id: int | None = None, warehouse_id: int | None = None) -> list[Stock]:
        stmt = sa.select(Stock).where(Stock.owner_id == owner_id)
        if product_id:
            stmt = stmt.where(Stock.product_id == product_id)
        if warehouse_id:
            stmt = stmt.where(Stock.warehouse_id == warehouse_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def adjust_stock(self, owner_id: int, product_id: int, warehouse_id: int, new_quantity: int, notes: str | None = None) -> Stock:
        stmt = sa.select(Stock).where(
            Stock.owner_id == owner_id,
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
            stock = Stock(owner_id=owner_id, product_id=product_id, warehouse_id=warehouse_id, quantity=new_quantity)
            self.db.add(stock)

        await self.db.flush()

        movement = StockMovement(
            owner_id=owner_id,
            product_id=product_id,
            warehouse_id=warehouse_id,
            type="adjustment",
            quantity=new_quantity - old_qty,
            notes=notes,
        )
        self.db.add(movement)
        await self.db.flush()

        return stock

    async def record_movement(self, owner_id: int, **data) -> StockMovement:
        product_id = data["product_id"]
        warehouse_id = data["warehouse_id"]
        quantity = data["quantity"]
        movement_type = data["type"]

        stmt = sa.select(Stock).where(
            Stock.owner_id == owner_id,
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
                stock = Stock(owner_id=owner_id, product_id=product_id, warehouse_id=warehouse_id, quantity=quantity)
                self.db.add(stock)
            elif movement_type == "out":
                raise ValueError("Cannot record out movement: no stock exists")

        await self.db.flush()

        movement = StockMovement(owner_id=owner_id, **data)
        self.db.add(movement)
        await self.db.flush()

        return movement

    async def get_movements(self, owner_id: int, product_id: int | None = None, limit: int = 50) -> list[StockMovement]:
        stmt = sa.select(StockMovement).where(StockMovement.owner_id == owner_id)
        if product_id:
            stmt = stmt.where(StockMovement.product_id == product_id)
        stmt = stmt.order_by(StockMovement.created_at.desc()).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_low_stock(self, owner_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(Stock).where(Stock.owner_id == owner_id, Stock.quantity <= 10)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
