from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_org_id, get_current_token_payload, require_permission
from app.core.exceptions import NotFoundException
from app.core.idgen import next_document_id
from app.purchase_requisition.models import PurchaseRequisition
from app.purchase_requisition.schemas import (
    PurchaseRequisitionConvert,
    PurchaseRequisitionCreate,
    PurchaseRequisitionDecision,
    PurchaseRequisitionOut,
)
from app.purchase_requisition.services import PurchaseRequisitionService

router = APIRouter(prefix="/purchase-requisitions", tags=["purchase-requisitions"])


def _actor(token_payload: dict) -> str:
    return str(token_payload.get("user_id") or token_payload.get("email") or "user")


@router.get("", response_model=list[PurchaseRequisitionOut])
async def list_requisitions(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = PurchaseRequisitionService(db)
    return await service.list_requisitions(org_id, status_filter=status)


@router.post("", response_model=PurchaseRequisitionOut, status_code=201)
async def create_requisition(
    req: PurchaseRequisitionCreate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    token_payload: dict = Depends(get_current_token_payload),
    _perm: bool = Depends(require_permission("purchase_orders.create")),
):
    service = PurchaseRequisitionService(db)
    pr_number = await next_document_id(db, PurchaseRequisition, "PR", "pr_number", org_id)
    return await service.create_requisition(
        org_id,
        pr_number,
        req.title,
        [i.model_dump() for i in req.items],
        requested_by=req.requested_by or _actor(token_payload),
        department=req.department,
        priority=req.priority,
        need_by_date=req.need_by_date,
        notes=req.notes,
    )


@router.get("/{pr_id}", response_model=PurchaseRequisitionOut)
async def get_requisition(
    pr_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = PurchaseRequisitionService(db)
    pr = await service.get_requisition(pr_id, org_id)
    if not pr:
        raise NotFoundException("Purchase requisition not found")
    return pr


@router.post("/{pr_id}/submit", response_model=PurchaseRequisitionOut)
async def submit_requisition(
    pr_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = PurchaseRequisitionService(db)
    return await service.update_status(pr_id, org_id, "SUBMITTED")


@router.post("/{pr_id}/approve", response_model=PurchaseRequisitionOut)
async def approve_requisition(
    pr_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    token_payload: dict = Depends(get_current_token_payload),
    _perm: bool = Depends(require_permission("purchase_orders.manage")),
):
    service = PurchaseRequisitionService(db)
    return await service.update_status(pr_id, org_id, "APPROVED", actor=_actor(token_payload))


@router.post("/{pr_id}/reject", response_model=PurchaseRequisitionOut)
async def reject_requisition(
    pr_id: int,
    req: PurchaseRequisitionDecision | None = None,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("purchase_orders.manage")),
):
    service = PurchaseRequisitionService(db)
    return await service.update_status(
        pr_id, org_id, "REJECTED", reason=req.reason if req else None
    )


@router.post("/{pr_id}/convert", response_model=PurchaseRequisitionOut)
async def convert_requisition(
    pr_id: int,
    req: PurchaseRequisitionConvert,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("purchase_orders.create")),
):
    """P1 -> P2: convert an APPROVED requisition into a Purchase Order."""
    service = PurchaseRequisitionService(db)
    return await service.convert_to_purchase_order(
        pr_id, org_id, req.supplier_id, req.warehouse_id
    )


@router.delete("/{pr_id}", status_code=204)
async def delete_requisition(
    pr_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("purchase_orders.delete")),
):
    service = PurchaseRequisitionService(db)
    deleted = await service.delete_requisition(pr_id, org_id)
    if not deleted:
        raise NotFoundException("Purchase requisition not found")
