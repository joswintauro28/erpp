import sqlalchemy as sa
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_org_id
from app.interaction.models import Enquiry, SiteVisit, FollowUp, Task, Communication, VisitPlan
from app.interaction.schemas import (
    EnquiryManagementData,
    SiteVisitManagementData,
    FollowUpManagementData,
    TaskManagementData,
    CommunicationManagementData,
    VisitPlanManagementData,
)

router = APIRouter(prefix="/api", tags=["interaction"])


@router.get("/enquiries", response_model=EnquiryManagementData)
async def get_enquiries_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
):
    result = await db.execute(sa.select(Enquiry).where(Enquiry.organization_id == user_id))
    enquiries = list(result.scalars().all())
    total = len(enquiries)
    open_count = len([e for e in enquiries if e.status in ["New", "In Progress"]])
    at_risk = len([e for e in enquiries if e.status == "Closed"])
    owners = len(set(e.organization_id for e in enquiries if e.organization_id)) or 1
    summary = {"total": total, "open": open_count, "overdue_at_risk": at_risk, "owners": owners}
    return {"summary": summary, "enquiries": enquiries}


@router.get("/site-visits", response_model=SiteVisitManagementData)
async def get_site_visits_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
):
    result = await db.execute(sa.select(SiteVisit).where(SiteVisit.organization_id == user_id))
    visits = list(result.scalars().all())
    total = len(visits)
    open_count = len([v for v in visits if v.status in ["Scheduled", "In Progress"]])
    at_risk = len([v for v in visits if v.status == "Cancelled"])
    owners = len(set(v.organization_id for v in visits if v.organization_id)) or 1
    summary = {"total": total, "open": open_count, "overdue_at_risk": at_risk, "owners": owners}
    return {"summary": summary, "site_visits": visits}


@router.get("/follow-ups", response_model=FollowUpManagementData)
async def get_follow_ups_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
):
    result = await db.execute(sa.select(FollowUp).where(FollowUp.organization_id == user_id))
    follow_ups = list(result.scalars().all())
    total = len(follow_ups)
    open_count = len([f for f in follow_ups if f.status in ["Pending", "In Progress"]])
    at_risk = len([f for f in follow_ups if f.status == "Overdue"])
    owners = len(set(f.organization_id for f in follow_ups if f.organization_id)) or 1
    summary = {"total": total, "open": open_count, "overdue_at_risk": at_risk, "owners": owners}
    return {"summary": summary, "follow_ups": follow_ups}


@router.get("/tasks", response_model=TaskManagementData)
async def get_tasks_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
):
    result = await db.execute(sa.select(Task).where(Task.organization_id == user_id))
    tasks = list(result.scalars().all())
    total = len(tasks)
    open_count = len([t for t in tasks if t.status in ["Pending", "In Progress"]])
    at_risk = len([t for t in tasks if t.status == "Overdue"])
    owners = len(set(t.organization_id for t in tasks if t.organization_id)) or 1
    summary = {"total": total, "open": open_count, "overdue_at_risk": at_risk, "owners": owners}
    return {"summary": summary, "tasks": tasks}


@router.get("/communications", response_model=CommunicationManagementData)
async def get_communications_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
):
    result = await db.execute(sa.select(Communication).where(Communication.organization_id == user_id))
    communications = list(result.scalars().all())
    total = len(communications)
    open_count = len([c for c in communications if c.type in ["Email", "Call", "Meeting"]])
    at_risk = 0
    owners = len(set(c.organization_id for c in communications if c.organization_id)) or 1
    summary = {"total": total, "open": open_count, "overdue_at_risk": at_risk, "owners": owners}
    return {"summary": summary, "communications": communications}


@router.get("/visit-plans", response_model=VisitPlanManagementData)
async def get_visit_plans_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
):
    result = await db.execute(sa.select(VisitPlan).where(VisitPlan.organization_id == user_id))
    plans = list(result.scalars().all())
    total = len(plans)
    open_count = len([p for p in plans if p.status in ["Planned", "In Progress"]])
    at_risk = len([p for p in plans if p.status == "Cancelled"])
    owners = len(set(p.organization_id for p in plans if p.organization_id)) or 1
    summary = {"total": total, "open": open_count, "overdue_at_risk": at_risk, "owners": owners}
    return {"summary": summary, "visit_plans": plans}
