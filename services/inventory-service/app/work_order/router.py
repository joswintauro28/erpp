from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_org_id, get_current_token_payload
from app.core.exceptions import NotFoundException
from app.core.idgen import next_document_id
from app.work_order.models import WorkOrder
from app.work_order.schemas import (
    WorkOrderCreate,
    WorkOrderMaterialIssue,
    WorkOrderOut,
)
from app.work_order.services import WorkOrderService

router = APIRouter(prefix="/work-orders", tags=["work-orders"])


@router.get("", response_model=list[WorkOrderOut])
async def list_work_orders(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = WorkOrderService(db)
    return await service.list_work_orders(org_id, status_filter=status)


@router.post("", response_model=WorkOrderOut, status_code=201)
async def create_work_order(
    req: WorkOrderCreate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    token_payload: dict = Depends(get_current_token_payload),
):
    service = WorkOrderService(db)
    wo_no = await next_document_id(db, WorkOrder, "WO", "work_order_no", org_id)
    return await service.create_work_order(
        org_id,
        wo_no,
        product_id=req.product_id,
        quantity=req.quantity,
        priority=req.priority,
        due_date=req.due_date,
        notes=req.notes,
        operations=[o.model_dump() for o in req.operations],
        materials=[m.model_dump() for m in req.materials],
        created_by=str(token_payload.get("user_id") or "user"),
    )


@router.get("/{wo_id}", response_model=WorkOrderOut)
async def get_work_order(
    wo_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = WorkOrderService(db)
    wo = await service.get_work_order(wo_id, org_id)
    if not wo:
        raise NotFoundException("Work order not found")
    return wo


@router.post("/{wo_id}/release", response_model=WorkOrderOut)
async def release_work_order(
    wo_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = WorkOrderService(db)
    return await service.release_work_order(wo_id, org_id)


@router.post("/{wo_id}/start", response_model=WorkOrderOut)
async def start_work_order(
    wo_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = WorkOrderService(db)
    return await service.start_work_order(wo_id, org_id)


@router.post("/{wo_id}/issue-material", response_model=WorkOrderOut)
async def issue_work_order_material(
    wo_id: int,
    req: WorkOrderMaterialIssue,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = WorkOrderService(db)
    return await service.issue_material(wo_id, org_id, req.product_id, req.quantity)


@router.post("/{wo_id}/operations/{operation_id}/start", response_model=WorkOrderOut)
async def start_operation(
    wo_id: int,
    operation_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = WorkOrderService(db)
    return await service.start_operation(wo_id, org_id, operation_id)


@router.post("/{wo_id}/operations/{operation_id}/complete", response_model=WorkOrderOut)
async def complete_operation(
    wo_id: int,
    operation_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = WorkOrderService(db)
    return await service.complete_operation(wo_id, org_id, operation_id)


@router.post("/{wo_id}/complete", response_model=WorkOrderOut)
async def complete_work_order(
    wo_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = WorkOrderService(db)
    return await service.complete_work_order(wo_id, org_id)


@router.post("/{wo_id}/cancel", response_model=WorkOrderOut)
async def cancel_work_order(
    wo_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = WorkOrderService(db)
    return await service.cancel_work_order(wo_id, org_id)


@router.delete("/{wo_id}", status_code=204)
async def delete_work_order(
    wo_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = WorkOrderService(db)
    wo = await service.get_work_order(wo_id, org_id)
    if not wo:
        raise NotFoundException("Work order not found")
    if wo.status in ("IN_PROGRESS", "COMPLETED"):
        raise HTTPException(status_code=409, detail=f"Cannot delete a {wo.status} work order")
    await service.repo.delete(wo_id)
