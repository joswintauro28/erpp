from fastapi import APIRouter, Depends

from app.core.deps import get_current_token_payload
from app.notification.services import NotificationService

router = APIRouter(tags=["notifications"])


@router.get("/notifications")
async def get_notifications(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    service = NotificationService(token)
    return await service.get_notifications()
