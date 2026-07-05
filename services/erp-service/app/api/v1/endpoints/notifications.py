from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.services.notification import NotificationService

router = APIRouter(tags=["notifications"])


@router.get("/notifications")
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = NotificationService(db)
    return await service.get_notifications(user_id)
