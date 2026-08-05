from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.serial_number.models import SerialNumber
from app.product.models import Product
from app.warehouse.models import Warehouse
from app.core.database import BaseRepository
from app.core.events import publish_event, EVENT_SERIAL_UPDATED

# Serial lifecycle transition map.
SERIAL_STATUS_FLOW: dict[str, set[str]] = {
    "in_stock": {"reserved", "in_transit", "sold", "repair", "damaged", "retired"},
    "reserved": {"in_stock", "sold", "in_transit"},
    "in_transit": {"in_stock", "sold", "reserved"},
    "sold": {"returned", "repair"},
    "returned": {"in_stock", "repair", "damaged", "retired"},
    "repair": {"in_stock", "damaged", "retired", "sold"},
    "damaged": {"retired"},
    "retired": set(),
}


class SerialNumberRepository(BaseRepository[SerialNumber]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, SerialNumber)


def _joins():
    return (
        sa.select(
            SerialNumber.id,
            SerialNumber.organization_id,
            SerialNumber.product_id,
            Product.name.label("product_name"),
            SerialNumber.sku,
            SerialNumber.warehouse_id,
            Warehouse.name.label("warehouse_name"),
            SerialNumber.serial_number,
            SerialNumber.status,
            SerialNumber.purchase_order_id,
            SerialNumber.sales_order_code,
            SerialNumber.warranty_until,
            SerialNumber.activated_at,
            SerialNumber.sold_at,
            SerialNumber.notes,
            SerialNumber.created_at,
            SerialNumber.updated_at,
        )
        .outerjoin(Product, Product.id == SerialNumber.product_id)
        .outerjoin(Warehouse, Warehouse.id == SerialNumber.warehouse_id)
    )


class SerialNumberService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SerialNumberRepository(db)

    async def list_serial_numbers(
        self,
        organization_id: int,
        product_id: int | None = None,
        warehouse_id: int | None = None,
        status: str | None = None,
        search: str | None = None,
    ) -> list[dict]:
        stmt = _joins().where(SerialNumber.organization_id == organization_id)
        if product_id:
            stmt = stmt.where(SerialNumber.product_id == product_id)
        if warehouse_id:
            stmt = stmt.where(SerialNumber.warehouse_id == warehouse_id)
        if status and status.upper() not in ("ALL", ""):
            stmt = stmt.where(SerialNumber.status == status.lower())
        if search:
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                sa.or_(
                    SerialNumber.serial_number.ilike(term),
                    SerialNumber.sku.ilike(term),
                    Product.name.ilike(term),
                )
            )
        stmt = stmt.order_by(SerialNumber.created_at.desc())
        result = await self.db.execute(stmt)
        return [dict(r._mapping) for r in result.all()]

    async def get_serial_number(self, serial_id: int, organization_id: int) -> dict | None:
        stmt = _joins().where(
            SerialNumber.id == serial_id,
            SerialNumber.organization_id == organization_id,
        )
        result = await self.db.execute(stmt)
        row = result.mappings().first()
        return dict(row) if row else None

    async def _resolve_product(self, organization_id: int, product_id: int) -> Product:
        stmt = sa.select(Product).where(
            Product.id == product_id, Product.organization_id == organization_id
        )
        result = await self.db.execute(stmt)
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {product_id} not found in this organization")
        return product

    async def _resolve_warehouse(self, organization_id: int, warehouse_id: int) -> Warehouse:
        stmt = sa.select(Warehouse).where(
            Warehouse.id == warehouse_id, Warehouse.organization_id == organization_id
        )
        result = await self.db.execute(stmt)
        warehouse = result.scalar_one_or_none()
        if not warehouse:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Warehouse {warehouse_id} not found in this organization")
        return warehouse

    async def _assert_unique_serial(self, organization_id: int, serial_number: str, exclude_id: int | None = None) -> None:
        stmt = sa.select(SerialNumber).where(
            SerialNumber.organization_id == organization_id,
            SerialNumber.serial_number == serial_number,
        )
        if exclude_id:
            stmt = stmt.where(SerialNumber.id != exclude_id)
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Serial number '{serial_number}' already registered for this organization",
            )

    def _validate_transition(self, old_status: str, new_status: str) -> None:
        if new_status not in SERIAL_STATUS_FLOW:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid serial status '{new_status}'",
            )
        if new_status != old_status and new_status not in SERIAL_STATUS_FLOW.get(old_status, set()):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invalid serial lifecycle transition '{old_status}' → '{new_status}'",
            )

    async def create_serial_number(self, organization_id: int, **data) -> dict:
        product = await self._resolve_product(organization_id, data["product_id"])
        await self._resolve_warehouse(organization_id, data["warehouse_id"])
        await self._assert_unique_serial(organization_id, data["serial_number"])

        data["status"] = data.get("status") or "in_stock"
        self._validate_transition("in_stock", data["status"])

        # SKU is an authoritative binding to the product model — never a free field.
        if data.get("sku") and data["sku"] != product.sku:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"SKU '{data['sku']}' does not match product '{product.name}' (expected '{product.sku}')",
            )
        data["sku"] = product.sku

        if data["status"] == "sold" and not data.get("sold_at"):
            data["sold_at"] = datetime.now(timezone.utc)
        if data["status"] == "in_stock" and not data.get("activated_at"):
            data["activated_at"] = datetime.now(timezone.utc)

        serial = await self.repo.create(organization_id=organization_id, **data)
        await self.db.flush()
        detail = await self.get_serial_number(serial.id, organization_id)
        if not detail:
            serial = await self.repo.get(serial.id)
            return {c.name: getattr(serial, c.name) for c in SerialNumber.__table__.columns}
        return detail

    async def update_serial_number(
        self, serial_id: int, organization_id: int, **data
    ) -> dict | None:
        serial = (
            await self.db.execute(
                sa.select(SerialNumber).where(
                    SerialNumber.id == serial_id,
                    SerialNumber.organization_id == organization_id,
                )
            )
        ).scalar_one_or_none()
        if not serial:
            return None

        if data.get("serial_number") and data["serial_number"] != serial.serial_number:
            await self._assert_unique_serial(organization_id, data["serial_number"], exclude_id=serial.id)

        if data.get("product_id") and data["product_id"] != serial.product_id:
            product = await self._resolve_product(organization_id, data["product_id"])
            data["sku"] = product.sku

        if data.get("sku") is not None:
            if data["sku"] != serial.sku:
                product = await self._resolve_product(organization_id, data.get("product_id") or serial.product_id)
                if data["sku"] != product.sku:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"SKU '{data['sku']}' does not match product '{product.name}' (expected '{product.sku}')",
                    )

        if data.get("status") and data["status"] != serial.status:
            self._validate_transition(serial.status, data["status"])
            if data["status"] == "sold" and not data.get("sold_at"):
                data["sold_at"] = datetime.now(timezone.utc)
            if data["status"] == "in_stock" and not serial.activated_at and not data.get("activated_at"):
                data["activated_at"] = datetime.now(timezone.utc)

        old_status = serial.status
        updated = await self.repo.update(serial_id, **data)
        await self.db.flush()
        if updated is None:
            return None

        detail = await self.get_serial_number(serial_id, organization_id)
        if not detail:
            return {c.name: getattr(updated, c.name) for c in SerialNumber.__table__.columns}

        if old_status != updated.status:
            publish_event(
                EVENT_SERIAL_UPDATED,
                organization_id=organization_id,
                serial_id=serial_id,
                serial_number=serial.serial_number,
                product_id=serial.product_id,
                sku=serial.sku,
                warehouse_id=serial.warehouse_id,
                from_status=old_status,
                to_status=updated.status,
            )
        return detail

    async def delete_serial_number(self, serial_id: int, organization_id: int) -> bool:
        serial = (
            await self.db.execute(
                sa.select(SerialNumber).where(
                    SerialNumber.id == serial_id,
                    SerialNumber.organization_id == organization_id,
                )
            )
        ).scalar_one_or_none()
        if not serial:
            return False
        if serial.status == "sold":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Sold serial units cannot be removed from the registry")
        return await self.repo.delete(serial_id)

    async def get_stats(self, organization_id: int) -> dict:
        stmt = sa.select(
            sa.func.count().label("total"),
            sa.func.count().filter(SerialNumber.status == "in_stock").label("in_stock"),
            sa.func.count().filter(SerialNumber.status == "reserved").label("reserved"),
            sa.func.count().filter(SerialNumber.status == "sold").label("sold"),
            sa.func.count().filter(SerialNumber.status == "returned").label("returned"),
            sa.func.count().filter(SerialNumber.status == "repair").label("repair"),
            sa.func.count().filter(SerialNumber.status == "damaged").label("damaged"),
            sa.func.count().filter(SerialNumber.status == "retired").label("retired"),
            sa.func.count().filter(SerialNumber.status == "in_transit").label("in_transit"),
        ).where(SerialNumber.organization_id == organization_id)
        result = await self.db.execute(stmt)
        row = result.one()
        return {
            "total": row.total,
            "in_stock": row.in_stock,
            "reserved": row.reserved,
            "sold": row.sold,
            "returned": row.returned,
            "repair": row.repair,
            "damaged": row.damaged,
            "retired": row.retired,
            "in_transit": row.in_transit,
        }

    async def count_serial_numbers(self, organization_id: int, status: str | None = None) -> int:
        stmt = sa.select(sa.func.count()).select_from(SerialNumber).where(SerialNumber.organization_id == organization_id)
        if status:
            stmt = stmt.where(SerialNumber.status == status)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
