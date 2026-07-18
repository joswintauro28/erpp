from datetime import datetime

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_org_id, get_current_token_payload
from app.core.exceptions import NotFoundException, ConflictException
from app.core.billing_client import trigger_vendor_bill
from app.purchase_order.schemas import PurchaseOrderCreate, PurchaseOrderOut, PurchaseOrderUpdate
from app.purchase_order.services import PurchaseOrderService
from app.supplier.models import Supplier

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
):
    service = PurchaseOrderService(db)
    order_number = f"PO-{datetime.now().strftime('%Y%m%d%H%M%S')}-{org_id}"
    items = [item.model_dump() for item in req.items]
    po = await service.create_purchase_order(
        org_id, order_number, items, **req.model_dump(exclude={"items"}),
    )

    if getattr(po, "status", None) == "ordered":
        po_with_items = await service.get_purchase_order_with_items(po.id, org_id)
        po_dict = {
            "order_number": po_with_items.order_number,
            "supplier_id": po_with_items.supplier_id,
            "items": [
                {
                    "product_id": i.product_id,
                    "quantity": i.quantity,
                    "unit_price": float(i.unit_price),
                }
                for i in (po_with_items.items or [])
            ],
            "total": float(po_with_items.total),
            "subtotal": float(po_with_items.subtotal),
        }
        supplier_result = await db.execute(sa.select(Supplier).where(Supplier.id == po.supplier_id))
        supplier = supplier_result.scalar_one_or_none()
        raw_token = token_payload.get("_raw_token", "")
        try:
            await trigger_vendor_bill(raw_token, org_id, po_dict, supplier.name if supplier else "")
        except Exception:
            pass

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
):
    service = PurchaseOrderService(db)
    if req.status:
        old_po = await service.get_purchase_order(po_id, org_id)
        old_status = old_po.status if old_po else None

        po = await service.update_purchase_order_status(po_id, org_id, req.status)
        if not po:
            raise NotFoundException("Purchase order not found")
        po = await service.get_purchase_order_with_items(po_id, org_id)

        if req.status == "ordered" and old_status != "ordered":
            po_dict = {
                "order_number": po.order_number,
                "supplier_id": po.supplier_id,
                "items": [
                    {
                        "product_id": i.product_id,
                        "quantity": i.quantity,
                        "unit_price": float(i.unit_price),
                    }
                    for i in (po.items or [])
                ],
                "total": float(po.total),
                "subtotal": float(po.subtotal),
            }
            supplier_result = await db.execute(sa.select(Supplier).where(Supplier.id == po.supplier_id))
            supplier = supplier_result.scalar_one_or_none()
            raw_token = token_payload.get("_raw_token", "")
            try:
                await trigger_vendor_bill(raw_token, org_id, po_dict, supplier.name if supplier else "")
            except Exception:
                pass

        return po
    raise HTTPException(status_code=400, detail="Status required")


@router.delete("/{po_id}", status_code=204)
async def delete_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = PurchaseOrderService(db)
    deleted = await service.delete_purchase_order(po_id, org_id)
    if not deleted:
        raise NotFoundException("Purchase order not found")
