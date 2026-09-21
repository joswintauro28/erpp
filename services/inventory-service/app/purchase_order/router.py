from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_org_id, get_current_token_payload, require_permission
from app.core.exceptions import NotFoundException
from app.core.idgen import next_document_id
from app.purchase_order.schemas import (
    PurchaseOrderCreate,
    PurchaseOrderOut,
    PurchaseOrderUpdate,
    PutawayRequest,
)
from app.purchase_order.services import PurchaseOrderService

router = APIRouter(prefix="/purchase-orders", tags=["purchase-orders"])


@router.get("", response_model=list[PurchaseOrderOut])
async def list_purchase_orders(
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = PurchaseOrderService(db)
    return await service.list_purchase_orders(org_id)


@router.post("", response_model=PurchaseOrderOut, status_code=201)
async def create_purchase_order(
    req: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    token_payload: dict = Depends(get_current_token_payload),
    _perm: bool = Depends(require_permission("purchase_orders.create")),
):
    service = PurchaseOrderService(db)
    from app.purchase_order.models import PurchaseOrder
    order_number = await next_document_id(db, PurchaseOrder, "PO", "order_number", org_id)
    items = [item.model_dump() for item in req.items]
    po = await service.create_purchase_order(
        org_id, order_number, items, **req.model_dump(exclude={"items"}),
    )
    po = await service.get_purchase_order_with_items(po.id, org_id)
    return po


@router.get("/{po_id}", response_model=PurchaseOrderOut)
async def get_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = PurchaseOrderService(db)
    po = await service.get_purchase_order_with_items(po_id, org_id)
    if not po:
        raise NotFoundException("Purchase order not found")
    return po


@router.put("/{po_id}/status", response_model=PurchaseOrderOut)
async def update_purchase_order_status(
    po_id: int,
    req: PurchaseOrderUpdate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    token_payload: dict = Depends(get_current_token_payload),
    _perm: bool = Depends(require_permission("purchase_orders.manage")),
):
    service = PurchaseOrderService(db)
    if not req.status:
        raise HTTPException(status_code=400, detail="Status required")

    received_items = [i.model_dump() for i in (req.received_items or [])]
    po = await service.update_purchase_order_status(
        po_id, org_id, req.status, received_items=received_items,
    )
    if not po:
        raise NotFoundException("Purchase order not found")

    po = await service.get_purchase_order_with_items(po_id, org_id)
    return po


@router.post("/{po_id}/putaway", response_model=PurchaseOrderOut)
async def putaway_purchase_order_items(
    po_id: int,
    req: PutawayRequest,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("purchase_orders.manage")),
):
    service = PurchaseOrderService(db)
    po = await service.putaway_items(po_id, org_id, [i.model_dump() for i in req.items])
    if not po:
        raise NotFoundException("Purchase order not found")
    return po


@router.delete("/{po_id}", status_code=204)
async def delete_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("purchase_orders.delete")),
):
    service = PurchaseOrderService(db)
    deleted = await service.delete_purchase_order(po_id, org_id)
    if not deleted:
        raise NotFoundException("Purchase order not found")
