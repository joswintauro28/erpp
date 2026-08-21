from datetime import datetime, timezone
import logging

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.core.database import BaseRepository
from app.core.events import (
    publish_event,
    EVENT_PURCHASE_REQUISITION_CREATED,
    EVENT_PURCHASE_REQUISITION_APPROVED,
)
from app.purchase_requisition.models import PurchaseRequisition, PurchaseRequisitionItem

logger = logging.getLogger("app.purchase_requisition")

PR_STATUS_FLOW: dict[str, set[str]] = {
    "DRAFT": {"SUBMITTED", "CANCELLED"},
    "SUBMITTED": {"APPROVED", "REJECTED", "CANCELLED"},
    "APPROVED": {"CONVERTED", "CANCELLED"},
    "REJECTED": {"SUBMITTED"},
    "CONVERTED": set(),
    "CANCELLED": set(),
}


class PurchaseRequisitionRepository(BaseRepository[PurchaseRequisition]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, PurchaseRequisition)


class PurchaseRequisitionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PurchaseRequisitionRepository(db)

    async def get_requisition(self, pr_id: int, organization_id: int) -> PurchaseRequisition | None:
        stmt = (
            sa.select(PurchaseRequisition)
            .options(selectinload(PurchaseRequisition.items))
            .where(PurchaseRequisition.id == pr_id, PurchaseRequisition.organization_id == organization_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_requisitions(self, organization_id: int, status_filter: str | None = None) -> list[PurchaseRequisition]:
        stmt = (
            sa.select(PurchaseRequisition)
            .options(selectinload(PurchaseRequisition.items))
            .where(PurchaseRequisition.organization_id == organization_id)
        )
        if status_filter and status_filter.upper() != "ALL":
            stmt = stmt.where(PurchaseRequisition.status == status_filter.upper())
        stmt = stmt.order_by(PurchaseRequisition.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_requisition(
        self,
        organization_id: int,
        pr_number: str,
        title: str,
        items: list[dict],
        **data,
    ) -> PurchaseRequisition:
        from app.product.models import Product

        resolved_items = []
        for item in items:
            pid = item.get("product_id")
            pname = item.get("product_name") or "Requisitioned Item"
            if not pid:
                prod_stmt = sa.select(Product).where(
                    Product.name == pname, Product.organization_id == organization_id
                )
                prod_res = await self.db.execute(prod_stmt)
                product = prod_res.scalar_one_or_none()
                if not product:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Unknown product '{pname}' — provide a valid product_id or create the product first",
                    )
                pid = product.id

            resolved_items.append(
                {
                    "product_id": pid,
                    "product_name": pname,
                    "quantity": int(item.get("quantity", 1)),
                    "estimated_price": float(item.get("estimated_price") or 0.0),
                }
            )

        pr = PurchaseRequisition(
            organization_id=organization_id,
            pr_number=pr_number,
            title=title,
            status="DRAFT",
            **data,
        )
        self.db.add(pr)
        await self.db.flush()

        for item in resolved_items:
            self.db.add(
                PurchaseRequisitionItem(requisition_id=pr.id, **item)
            )

        await self.db.commit()
        await self.db.refresh(pr)

        publish_event(
            EVENT_PURCHASE_REQUISITION_CREATED,
            organization_id=organization_id,
            pr_id=pr.id,
            pr_number=pr.pr_number,
            title=pr.title,
            total_estimated=sum(
                float(i.quantity) * float(i.estimated_price) for i in pr.items
            ),
        )
        return await self.get_requisition(pr.id, organization_id) or pr

    async def update_status(
        self,
        pr_id: int,
        organization_id: int,
        new_status: str,
        actor: str | None = None,
        reason: str | None = None,
    ) -> PurchaseRequisition:
        pr = await self.get_requisition(pr_id, organization_id)
        if not pr:
            raise HTTPException(status_code=404, detail="Purchase requisition not found")

        new_status = new_status.upper()
        if new_status not in PR_STATUS_FLOW:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid requisition status '{new_status}'. Allowed: {', '.join(PR_STATUS_FLOW.keys())}",
            )
        if new_status != pr.status and new_status not in PR_STATUS_FLOW.get(pr.status, set()):
            raise HTTPException(
                status_code=409,
                detail=f"Invalid requisition transition '{pr.status}' → '{new_status}'",
            )

        now = datetime.now(timezone.utc)
        if new_status == "SUBMITTED":
            pass
        elif new_status == "APPROVED":
            pr.approved_by = actor
            pr.approved_at = now
        elif new_status == "REJECTED":
            pr.rejected_reason = reason
        elif new_status == "CANCELLED":
            pr.rejected_reason = reason or "Cancelled"

        pr.status = new_status
        await self.db.commit()
        await self.db.refresh(pr)

        if new_status == "APPROVED":
            publish_event(
                EVENT_PURCHASE_REQUISITION_APPROVED,
                organization_id=organization_id,
                pr_id=pr.id,
                pr_number=pr.pr_number,
                approved_by=actor,
            )
        return pr

    async def convert_to_purchase_order(
        self, pr_id: int, organization_id: int, supplier_id: int, warehouse_id: int
    ) -> PurchaseRequisition:
        """P1 -> P2: convert an APPROVED requisition into a Purchase Order."""
        pr = await self.get_requisition(pr_id, organization_id)
        if not pr:
            raise HTTPException(status_code=404, detail="Purchase requisition not found")
        if pr.status != "APPROVED":
            raise HTTPException(
                status_code=409, detail="Only APPROVED requisitions can be converted to a purchase order"
            )
        if pr.purchase_order_id:
            raise HTTPException(status_code=409, detail="Requisition already converted to a purchase order")

        from app.purchase_order.services import PurchaseOrderService
        from app.purchase_order.models import PurchaseOrder

        po_service = PurchaseOrderService(self.db)
        po_number = None
        # Generate a PO number scoped to this org without touching the event
        # payload (PurchaseOrderService publishes inventory.po.created itself).
        from app.core.idgen import next_document_id

        po_number = await next_document_id(self.db, PurchaseOrder, "PO", "order_number", organization_id)
        items = [
            {
                "product_id": item.product_id,
                "quantity": item.quantity,
                "unit_price": float(item.estimated_price or 0.0),
            }
            for item in pr.items
        ]
        po = await po_service.create_purchase_order(
            organization_id,
            po_number,
            items,
            supplier_id=supplier_id,
            warehouse_id=warehouse_id,
            notes=f"Converted from requisition {pr.pr_number}",
        )

        pr.purchase_order_id = po.id
        pr.status = "CONVERTED"
        await self.db.commit()
        await self.db.refresh(pr)
        return pr

    async def delete_requisition(self, pr_id: int, organization_id: int) -> bool:
        pr = await self.get_requisition(pr_id, organization_id)
        if not pr:
            return False
        if pr.status not in ("DRAFT", "REJECTED", "CANCELLED"):
            raise HTTPException(
                status_code=409,
                detail=f"Cannot delete a {pr.status} requisition",
            )
        del_stmt = sa.delete(PurchaseRequisitionItem).where(
            PurchaseRequisitionItem.requisition_id == pr_id
        )
        await self.db.execute(del_stmt)
        return await self.repo.delete(pr_id)

    async def count_requisitions(self, organization_id: int, status_filter: str | None = None) -> int:
        stmt = sa.select(sa.func.count()).select_from(PurchaseRequisition).where(
            PurchaseRequisition.organization_id == organization_id
        )
        if status_filter:
            stmt = stmt.where(PurchaseRequisition.status == status_filter)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
