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


@router.get("/notifications/alerts")
async def get_alert_feed(
    payload: dict = Depends(get_current_token_payload),
):
    from app.events.notifications_consumer import recent_alerts
    alerts = list(reversed(recent_alerts))
    return {
        "total": len(alerts),
        "alerts": alerts,
    }
