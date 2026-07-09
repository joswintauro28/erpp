from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.core.exceptions import NotFoundException
from app.lead.schemas import LeadCreate, LeadOut, LeadUpdate
from app.lead.services import LeadService

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", response_model=list[LeadOut])
async def list_leads(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = LeadService(db)
    return await service.list_leads(user_id)


@router.post("", response_model=LeadOut, status_code=201)
async def create_lead(
    req: LeadCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = LeadService(db)
    return await service.create_lead(user_id, **req.model_dump())


@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = LeadService(db)
    lead = await service.get_lead(lead_id, user_id)
    if not lead:
        raise NotFoundException("Lead not found")
    return lead


@router.put("/{lead_id}", response_model=LeadOut)
async def update_lead(
    lead_id: int,
    req: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = LeadService(db)
    lead = await service.update_lead(
        lead_id, user_id, **{k: v for k, v in req.model_dump().items() if v is not None}
    )
    if not lead:
        raise NotFoundException("Lead not found")
    return lead


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = LeadService(db)
    deleted = await service.delete_lead(lead_id, user_id)
    if not deleted:
        raise NotFoundException("Lead not found")


@router.post("/{lead_id}/convert", response_model=LeadOut)
async def convert_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = LeadService(db)
    lead = await service.convert_lead(lead_id, user_id)
    if not lead:
        raise NotFoundException("Lead not found")
    return lead
