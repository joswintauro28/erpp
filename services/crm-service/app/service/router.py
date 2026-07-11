import sqlalchemy as sa
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.service.models import Complaint, Feedback
from app.service.schemas import ComplaintManagementData, FeedbackManagementData

router = APIRouter(prefix="/api", tags=["service"])


@router.get("/complaints", response_model=ComplaintManagementData)
async def get_complaints_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(sa.select(Complaint).where(Complaint.owner_id == user_id))
    complaints = list(result.scalars().all())
    total = len(complaints)
    open_count = len([c for c in complaints if c.status in ["Open", "In Progress"]])
    at_risk = len([c for c in complaints if c.status == "Escalated"])
    owners = len(set(c.owner_id for c in complaints if c.owner_id)) or 1
    summary = {"total_complaints": total, "open": open_count, "overdue_at_risk": at_risk, "owners": owners}
    return {"summary": summary, "complaints": complaints}


@router.get("/feedback", response_model=FeedbackManagementData)
async def get_feedback_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(sa.select(Feedback).where(Feedback.owner_id == user_id))
    feedback_list = list(result.scalars().all())
    total = len(feedback_list)
    avg_score = round(sum(f.score for f in feedback_list) / total, 1) if total else 0
    open_count = len([f for f in feedback_list if f.score >= 4])
    at_risk = len([f for f in feedback_list if f.score <= 2])
    owners = len(set(f.owner_id for f in feedback_list if f.owner_id)) or 1
    summary = {"total_feedback": total, "open": open_count, "overdue_at_risk": at_risk, "owners": owners}
    return {"summary": summary, "feedback": feedback_list}
