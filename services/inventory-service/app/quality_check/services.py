from datetime import datetime, timezone
import logging

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.core.database import BaseRepository
from app.core.events import publish_event, EVENT_QUALITY_CHECK
from app.quality_check.models import QualityCheck

logger = logging.getLogger("app.quality_check")


class QualityCheckRepository(BaseRepository[QualityCheck]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, QualityCheck)


class QualityCheckService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = QualityCheckRepository(db)

    async def list_checks(self, organization_id: int, status_filter: str | None = None) -> list[QualityCheck]:
        stmt = sa.select(QualityCheck).where(QualityCheck.organization_id == organization_id)
        if status_filter and status_filter.upper() != "ALL":
            stmt = stmt.where(QualityCheck.status == status_filter.upper())
        stmt = stmt.order_by(QualityCheck.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_check(
        self,
        organization_id: int,
        product_id: int | None,
        quantity: int,
        product_name: str | None = None,
        po_id: int | None = None,
        po_item_id: int | None = None,
        notes: str | None = None,
        status: str = "PENDING",
    ) -> QualityCheck:
        """Create a quality check, resolving the product by id OR name.

        No commit is performed here: this may be called mid-transaction from
        the goods-receipt flow, so the caller (or the `get_db` dependency)
        owns the commit. Flushing is enough to populate the id.
        """
        from app.product.models import Product

        if not product_id:
            prod_stmt = sa.select(Product).where(
                Product.name == product_name,
                Product.organization_id == organization_id,
            )
            prod_res = await self.db.execute(prod_stmt)
            product = prod_res.scalar_one_or_none()
            if not product:
                raise HTTPException(
                    status_code=404,
                    detail="Unknown product — provide a valid product_id or product_name",
                )
            product_id = product.id
        elif not product_name:
            prod_stmt = sa.select(Product).where(
                Product.id == product_id, Product.organization_id == organization_id
            )
            prod_res = await self.db.execute(prod_stmt)
            product = prod_res.scalar_one_or_none()
            if not product:
                raise HTTPException(status_code=404, detail="Product not found")
            product_name = product.name

        check = QualityCheck(
            organization_id=organization_id,
            po_id=po_id,
            po_item_id=po_item_id,
            product_id=product_id,
            product_name=product_name or f"Product {product_id}",
            quantity=quantity,
            status=status,
            notes=notes,
        )
        self.db.add(check)
        await self.db.flush()
        await self.db.refresh(check)
        return check

    async def record_result(
        self,
        check_id: int,
        organization_id: int,
        status: str,
        inspected_by: str | None = None,
        notes: str | None = None,
    ) -> QualityCheck:
        check = await self.get_check(check_id, organization_id)
        if not check:
            raise HTTPException(status_code=404, detail="Quality check not found")
        if check.status != "PENDING":
            raise HTTPException(
                status_code=409,
                detail=f"Quality check already resolved as {check.status}",
            )

        check.status = status
        check.inspected_by = inspected_by
        check.inspected_at = datetime.now(timezone.utc)
        check.notes = notes
        await self.db.commit()
        await self.db.refresh(check)

        publish_event(
            EVENT_QUALITY_CHECK,
            organization_id=organization_id,
            check_id=check.id,
            po_id=check.po_id,
            product_id=check.product_id,
            product_name=check.product_name,
            quantity=check.quantity,
            status=check.status,
            notes=notes,
        )
        logger.info(
            f"Quality check {check.id} for {check.product_name}: {check.status} "
            f"({check.quantity} units)"
        )
        return check

    async def get_check(self, check_id: int, organization_id: int) -> QualityCheck | None:
        stmt = sa.select(QualityCheck).where(
            QualityCheck.id == check_id, QualityCheck.organization_id == organization_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_for_receipt(
        self,
        organization_id: int,
        po_id: int,
        po_items: list,
    ) -> list[QualityCheck]:
        """P4 gate: on GRN, auto-create PENDING checks for qc_required products."""
        from app.product.models import Product

        product_ids = [item.product_id for item in po_items if item.product_id]
        if not product_ids:
            return []
        stmt = sa.select(Product).where(
            Product.id.in_(product_ids),
            Product.organization_id == organization_id,
            Product.qc_required.is_(True),
        )
        result = await self.db.execute(stmt)
        qc_products = {p.id: p.name for p in result.scalars().all()}
        if not qc_products:
            return []

        created = []
        for item in po_items:
            pname = qc_products.get(item.product_id)
            if not pname:
                continue
            check = await self.create_check(
                organization_id,
                item.product_id,
                quantity=item.quantity,
                product_name=pname,
                po_id=po_id,
                po_item_id=item.id,
                notes="Auto-created on goods receipt — QC required",
            )
            created.append(check)
        return created

    async def count_checks(self, organization_id: int, status_filter: str | None = None) -> int:
        stmt = sa.select(sa.func.count()).select_from(QualityCheck).where(
            QualityCheck.organization_id == organization_id
        )
        if status_filter:
            stmt = stmt.where(QualityCheck.status == status_filter)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
