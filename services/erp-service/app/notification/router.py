from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id, get_current_token_payload
from app.notification.services import NotificationService

router = APIRouter(tags=["notifications"])


@router.get("/notifications")
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    service = NotificationService(db, token)
    return await service.get_notifications(user_id)
