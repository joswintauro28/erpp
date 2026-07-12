import sqlalchemy as sa
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_org_id
from app.ai.models import AIAssistantLog as AiLog
from app.ai.schemas import AIAssistantManagementData as AiAssistantData

router = APIRouter(prefix="/api", tags=["ai"])


@router.get("/ai-assistant", response_model=AiAssistantData)
async def get_ai_assistant_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
):
    result = await db.execute(sa.select(AiLog).where(AiLog.organization_id == user_id))
    logs = list(result.scalars().all())
    total = len(logs)
    open_count = len([l for l in logs if l.status in ["New", "In Progress"]])
    at_risk = len([l for l in logs if l.status == "Failed"])
    owners = len(set(l.organization_id for l in logs if l.organization_id)) or 1
    summary = {"total": total, "open": open_count, "overdue_at_risk": at_risk, "owners": owners}
    return {"summary": summary, "ai_logs": logs}
