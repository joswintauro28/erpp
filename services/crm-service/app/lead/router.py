import sqlalchemy as sa
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.lead.models import Lead, Opportunity
from app.lead.schemas import LeadManagementData, OpportunityManagementData

router = APIRouter(prefix="/api", tags=["lead"])


@router.get("/leads", response_model=LeadManagementData)
async def get_leads_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(sa.select(Lead).where(Lead.owner_id == user_id))
    leads = list(result.scalars().all())

    total = len(leads)
    open_count = len([l for l in leads if l.status in ['New', 'Qualified', 'In Progress']])
    at_risk = len([l for l in leads if l.status == 'Lost'])
    owners_count = len(set(l.owner_id for l in leads if l.owner_id)) or 1

    summary = {
        "total_leads": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count,
    }

    return {"summary": summary, "leads": leads}


@router.get("/opportunities", response_model=OpportunityManagementData)
async def get_opportunities_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(sa.select(Opportunity).where(Opportunity.owner_id == user_id))
    opportunities = list(result.scalars().all())

    total = len(opportunities)
    open_count = len([o for o in opportunities if o.stage in ['Discovery', 'Proposal', 'Negotiation']])
    at_risk = len([o for o in opportunities if o.stage == 'Lost'])
    owners_count = len(set(o.owner_id for o in opportunities if o.owner_id)) or 1

    summary = {
        "total_opportunities": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count,
    }

    return {"summary": summary, "opportunities": opportunities}
