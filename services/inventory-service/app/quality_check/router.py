from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_org_id, get_current_token_payload
from app.core.exceptions import NotFoundException
from app.quality_check.schemas import QualityCheckCreate, QualityCheckOut, QualityCheckResult
from app.quality_check.services import QualityCheckService

router = APIRouter(prefix="/quality-checks", tags=["quality-checks"])


def _actor(token_payload: dict) -> str:
    return str(token_payload.get("user_id") or token_payload.get("email") or "inspector")


@router.get("", response_model=list[QualityCheckOut])
async def list_quality_checks(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = QualityCheckService(db)
    return await service.list_checks(org_id, status_filter=status)


@router.post("", response_model=QualityCheckOut, status_code=201)
async def create_quality_check(
    req: QualityCheckCreate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = QualityCheckService(db)
    return await service.create_check(
        org_id,
        req.product_id,
        req.quantity,
        product_name=req.product_name,
        po_id=req.po_id,
        po_item_id=req.po_item_id,
        notes=req.notes,
    )


@router.get("/{check_id}", response_model=QualityCheckOut)
async def get_quality_check(
    check_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = QualityCheckService(db)
    check = await service.get_check(check_id, org_id)
    if not check:
        raise NotFoundException("Quality check not found")
    return check


@router.put("/{check_id}/result", response_model=QualityCheckOut)
async def record_quality_check_result(
    check_id: int,
    req: QualityCheckResult,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    token_payload: dict = Depends(get_current_token_payload),
):
    service = QualityCheckService(db)
    return await service.record_result(
        check_id,
        org_id,
        req.status,
        inspected_by=_actor(token_payload),
        notes=req.notes,
    )
