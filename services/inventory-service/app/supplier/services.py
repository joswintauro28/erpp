import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import HTTPException, status

from app.supplier.models import Supplier
from app.core.database import BaseRepository
from app.core.events import publish_event, EVENT_SUPPLIER_STATUS

SUPPLIER_STATUS_FLOW: dict[str, set[str]] = {
    "ACTIVE": {"INACTIVE", "SUSPENDED"},
    "INACTIVE": {"ACTIVE"},
    "SUSPENDED": {"ACTIVE", "INACTIVE"},
}


class SupplierRepository(BaseRepository[Supplier]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Supplier)


class SupplierService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SupplierRepository(db)

    async def list_suppliers(self, organization_id: int) -> list[Supplier]:
        stmt = sa.select(Supplier).where(Supplier.organization_id == organization_id).order_by(Supplier.name)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_supplier(self, supplier_id: int, organization_id: int) -> Supplier | None:
        stmt = sa.select(Supplier).where(Supplier.id == supplier_id, Supplier.organization_id == organization_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_supplier(self, organization_id: int, **data) -> Supplier:
        data["status"] = data.get("status", "ACTIVE").upper()
        supplier = await self.repo.create(organization_id=organization_id, **data)
        supplier.is_active = supplier.status != "INACTIVE"
        await self.db.flush()
        return supplier

    async def update_supplier(self, supplier_id: int, organization_id: int, **data) -> Supplier | None:
        supplier = await self.get_supplier(supplier_id, organization_id)
        if not supplier:
            return None

        new_status = data.get("status")
        if data.get("is_active") is not None:
            requested_status = "ACTIVE" if data["is_active"] else "INACTIVE"
            new_status = requested_status if new_status is None else new_status
            data.pop("is_active", None)

        if new_status is not None:
            new_status = str(new_status).upper()
            self._validate_transition(supplier.status, new_status)
            data["status"] = new_status
        elif "is_active" not in data and "status" not in data:
            pass

        if "is_active" in data:
            data.pop("is_active")

        updated = await self.repo.update(supplier_id, **data)
        if updated:
            updated.is_active = updated.status != "INACTIVE"
            await self.db.flush()
            if updated.status != supplier.status:
                publish_event(
                    EVENT_SUPPLIER_STATUS,
                    organization_id=organization_id,
                    supplier_id=supplier.id,
                    supplier_name=supplier.name,
                    from_status=supplier.status,
                    to_status=updated.status,
                )
        return updated

    def _validate_transition(self, old_status: str, new_status: str) -> None:
        if new_status not in SUPPLIER_STATUS_FLOW:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid supplier status '{new_status}'. Allowed: ACTIVE, INACTIVE, SUSPENDED",
            )
        if new_status != old_status and new_status not in SUPPLIER_STATUS_FLOW.get(old_status, set()):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invalid supplier status transition '{old_status}' → '{new_status}'",
            )

    async def delete_supplier(self, supplier_id: int, organization_id: int) -> bool:
        supplier = await self.get_supplier(supplier_id, organization_id)
        if not supplier:
            return False
        return await self.repo.delete(supplier_id)

    async def count_suppliers(self, organization_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(Supplier).where(Supplier.organization_id == organization_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
