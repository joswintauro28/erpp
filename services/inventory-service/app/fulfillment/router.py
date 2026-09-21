from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_org_id, require_permission
from app.fulfillment.schemas import (
    FulfillmentCreate,
    FulfillmentDispatchAction,
    FulfillmentOut,
    PickingBatchCreate,
    PickingBatchOut,
    StockCheckResult,
)
from app.fulfillment.services import FulfillmentService

router = APIRouter(prefix="/fulfillment", tags=["fulfillment"])


@router.get("/orders", response_model=list[FulfillmentOut])
async def list_fulfillment_orders(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = FulfillmentService(db)
    return await service.list_fulfillments(org_id, status_filter=status)


@router.post("/orders", response_model=FulfillmentOut, status_code=201)
async def create_fulfillment_order(
    data: FulfillmentCreate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("stock.manage")),
):
    service = FulfillmentService(db)
    return await service.create_fulfillment(org_id, data)


@router.get("/orders/{fulfillment_id}", response_model=FulfillmentOut)
async def get_fulfillment_order(
    fulfillment_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = FulfillmentService(db)
    return await service.get_fulfillment(org_id, fulfillment_id)


@router.post("/orders/{fulfillment_id}/check-stock", response_model=StockCheckResult)
async def check_fulfillment_stock(
    fulfillment_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("stock.view")),
):
    service = FulfillmentService(db)
    return await service.check_stock(org_id, fulfillment_id)


@router.post("/orders/{fulfillment_id}/reserve", response_model=FulfillmentOut)
async def reserve_fulfillment_stock(
    fulfillment_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("stock.manage")),
):
    service = FulfillmentService(db)
    return await service.reserve_stock(org_id, fulfillment_id)


@router.post("/orders/{fulfillment_id}/pick-list", response_model=FulfillmentOut)
async def pick_fulfillment_items(
    fulfillment_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("stock.manage")),
):
    service = FulfillmentService(db)
    return await service.pick_items(org_id, fulfillment_id)


@router.post("/orders/{fulfillment_id}/pack", response_model=FulfillmentOut)
async def pack_fulfillment_items(
    fulfillment_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("stock.manage")),
):
    service = FulfillmentService(db)
    return await service.pack_items(org_id, fulfillment_id)


@router.post("/orders/{fulfillment_id}/dispatch", response_model=FulfillmentOut)
async def dispatch_fulfillment_order(
    fulfillment_id: int,
    data: FulfillmentDispatchAction,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("stock.manage")),
):
    service = FulfillmentService(db)
    return await service.dispatch_order(org_id, fulfillment_id, data)


@router.post("/orders/{fulfillment_id}/create-po-shortage", response_model=FulfillmentOut)
async def trigger_po_for_fulfillment_shortage(
    fulfillment_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("purchase_orders.create")),
):
    service = FulfillmentService(db)
    return await service.trigger_po_for_shortage(org_id, fulfillment_id)


@router.post("/orders/{fulfillment_id}/shipping-label")
async def generate_fulfillment_shipping_label(
    fulfillment_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("stock.manage")),
):
    service = FulfillmentService(db)
    return await service.generate_shipping_label(org_id, fulfillment_id)


@router.post("/orders/{fulfillment_id}/generate-invoice", response_model=FulfillmentOut)
async def generate_invoice_for_fulfillment(
    fulfillment_id: int,
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("stock.manage")),
):
    token = authorization.split(" ")[1] if authorization and authorization.startswith("Bearer ") else None
    service = FulfillmentService(db)
    return await service.generate_invoice_link(org_id, fulfillment_id, raw_token=token)


@router.delete("/orders/{fulfillment_id}", status_code=204)
async def delete_fulfillment_order(
    fulfillment_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("stock.manage")),
):
    service = FulfillmentService(db)
    await service.delete_fulfillment(org_id, fulfillment_id)


@router.post("/batches", response_model=PickingBatchOut, status_code=201)
async def create_picking_batch(
    data: PickingBatchCreate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("stock.manage")),
):
    """I7: create a picking wave/batch from reserved fulfillments."""
    service = FulfillmentService(db)
    return await service.create_picking_batch(org_id, data.fulfillment_ids)


@router.get("/batches", response_model=list[PickingBatchOut])
async def list_picking_batches(
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = FulfillmentService(db)
    return await service.list_picking_batches(org_id)


@router.post("/orders/{fulfillment_id}/step-back", response_model=FulfillmentOut)
async def step_back_fulfillment_order(
    fulfillment_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("stock.manage")),
):
    service = FulfillmentService(db)
    return await service.step_back(org_id, fulfillment_id)
