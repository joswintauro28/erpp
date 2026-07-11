"""Seed script for inventory-service database (erp_inventory)."""
import asyncio

from app.core.database import async_session_factory, engine, Base
from app.product.models import Product
from app.warehouse.models import Warehouse
from app.stock.models import Stock, StockMovement
from app.supplier.models import Supplier
from app.purchase_order.models import PurchaseOrder, PurchaseOrderItem
from app.serial_number.models import SerialNumber


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        owner_id = 1

        warehouse = Warehouse(owner_id=owner_id, name="Main Warehouse", code="WH-MAIN", city="Mumbai", state="Maharashtra")
        db.add(warehouse)
        await db.flush()

        products = [
            Product(owner_id=owner_id, name="Steel Rod 12mm", sku="SR-12MM", category="Raw Materials", unit="kg", price=850.00, cost_price=650.00, low_stock_threshold=50),
            Product(owner_id=owner_id, name="Cement 50kg Bag", sku="CM-50KG", category="Raw Materials", unit="bag", price=380.00, cost_price=290.00, low_stock_threshold=20),
            Product(owner_id=owner_id, name="PVC Pipe 4 inch", sku="PVC-4IN", category="Plumbing", unit="pcs", price=220.00, cost_price=155.00, low_stock_threshold=30),
            Product(owner_id=owner_id, name="Electrical Wire 1.5mm (100m)", sku="EW-1.5MM", category="Electrical", unit="roll", price=4500.00, cost_price=3200.00, uses_serial_tracking=True, low_stock_threshold=5),
            Product(owner_id=owner_id, name="Paint Bucket 20L", sku="PT-20L", category="Finishing", unit="bucket", price=2800.00, cost_price=1900.00, low_stock_threshold=10),
        ]
        for p in products:
            db.add(p)
        await db.flush()

        for p in products:
            s = Stock(owner_id=owner_id, product_id=p.id, warehouse_id=warehouse.id, quantity=100)
            db.add(s)
            await db.flush()

        supplier = Supplier(owner_id=owner_id, name="Acme Materials Pvt Ltd", email="orders@acme.in", phone="+91-9876543210", city="Mumbai", state="Maharashtra", payment_terms="Net 30")
        db.add(supplier)
        await db.flush()

        await db.commit()

    print("Seed data inserted successfully.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
