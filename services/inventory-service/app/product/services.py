import hashlib
import hmac
from datetime import datetime, timezone
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.product.models import Product
from app.core.database import BaseRepository



class ProductRepository(BaseRepository[Product]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Product)


class ProductService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProductRepository(db)

    async def list_products(self, organization_id: int) -> list[Product]:
        stmt = sa.select(Product).where(Product.organization_id == organization_id).order_by(Product.name)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_product(self, product_id: int, organization_id: int) -> Product | None:
        stmt = sa.select(Product).where(Product.id == product_id, Product.organization_id == organization_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_product(self, organization_id: int, **data) -> Product:
        return await self.repo.create(organization_id=organization_id, **data)

    async def update_product(self, product_id: int, organization_id: int, **data) -> Product | None:
        product = await self.get_product(product_id, organization_id)
        if not product:
            return None
        return await self.repo.update(product_id, **data)

    async def delete_product(self, product_id: int, organization_id: int) -> bool:
        product = await self.get_product(product_id, organization_id)
        if not product:
            return False
        return await self.repo.delete(product_id)

    async def count_products(self, organization_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(Product).where(Product.organization_id == organization_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def count_low_stock(self, organization_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(Product).where(
            Product.organization_id == organization_id,
            Product.track_inventory == True,
            Product.stock <= Product.low_stock_threshold,
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def get_cost_snapshot(
        self,
        product_id: int,
        organization_id: int,
        quantity: float = 1.0,
        warehouse_id: int | None = None,
        batch_number: str | None = None,
        serial_number: str | None = None,
    ) -> dict | None:
        product = await self.get_product(product_id, organization_id)
        if not product:
            return None

        unit_cost = float(product.cost_price or 0.0)
        total_cost = unit_cost * quantity
        now_iso = datetime.now(timezone.utc).isoformat()
        cost_version = "v1.0"
        tx_ref = f"MOV-{product_id}-{int(datetime.now(timezone.utc).timestamp())}"

        raw_str = f"{product_id}:{quantity}:{unit_cost}:{now_iso}:{cost_version}:{tx_ref}"
        snapshot_hash = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()
        signature = hmac.new(b"datavox-cogs-secret-key", snapshot_hash.encode("utf-8"), hashlib.sha256).hexdigest()

        return {
            "product_id": product.id,
            "sku": product.sku,
            "product_name": product.name,
            "quantity": quantity,
            "unit_cost": unit_cost,
            "total_cost": total_cost,
            "currency": "USD",
            "costing_method": product.costing_method or "fifo",
            "warehouse_id": warehouse_id,
            "warehouse_name": f"Warehouse #{warehouse_id}" if warehouse_id else "Default Warehouse",
            "batch_number": batch_number,
            "serial_number": serial_number,
            "inventory_transaction_id": None,
            "cost_calculation_timestamp": now_iso,
            "cost_version": cost_version,
            "inventory_movement_reference": tx_ref,
            "cost_layers": [
                {
                    "batch_id": None,
                    "serial_number": serial_number,
                    "quantity": quantity,
                    "unit_cost": unit_cost,
                    "layer_timestamp": now_iso,
                }
            ],
            "snapshot_hash": snapshot_hash,
            "signature": signature,
        }

    async def get_batch_costs(self, organization_id: int, items: list[dict]) -> dict:
        now_iso = datetime.now(timezone.utc).isoformat()
        results = []
        for item in items:
            product_id = item["product_id"]
            qty = float(item.get("quantity", 1.0))
            wh_id = item.get("warehouse_id")
            batch_no = item.get("batch_number")
            serial_no = item.get("serial_number")

            snapshot = await self.get_cost_snapshot(
                product_id=product_id,
                organization_id=organization_id,
                quantity=qty,
                warehouse_id=wh_id,
                batch_number=batch_no,
                serial_number=serial_no,
            )
            if snapshot:
                results.append({
                    "product_id": product_id,
                    "sku": snapshot["sku"],
                    "product_name": snapshot["product_name"],
                    "quantity": qty,
                    "unit_cost": snapshot["unit_cost"],
                    "total_cost": snapshot["total_cost"],
                    "costing_method": snapshot["costing_method"],
                    "warehouse_id": wh_id,
                    "batch_number": batch_no,
                    "serial_number": serial_no,
                    "snapshot": snapshot,
                })

        return {
            "costs": results,
            "currency": "USD",
            "resolved_at": now_iso,
        }

