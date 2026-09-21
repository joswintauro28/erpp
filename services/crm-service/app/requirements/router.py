from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app import database
from app.requirements import schemas, crud
from app.core.deps import get_current_token_payload

router = APIRouter(prefix="/api/requirements", tags=["requirements"])

@router.get("", response_model=schemas.RequirementManagementData)
async def get_requirements_data(
    db: AsyncSession = Depends(database.get_db),
    payload: dict = Depends(get_current_token_payload),
):
    owner_id = payload.get("user_id")
    requirements = await crud.get_requirements(db, owner_id=owner_id)

    total = len(requirements)
    open_count = len([r for r in requirements if r.status in ['Draft', 'Review']])
    at_risk = len([r for r in requirements if r.status == 'Cancelled'])
    owners_count = len(set(r.owner for r in requirements if r.owner)) or 1

    summary = {
        "total_requirements": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }

    return {
        "summary": summary,
        "requirements": requirements
    }
