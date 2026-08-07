from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_token_payload
from app.notification.schemas import (
    NotificationListResponse,
    NotificationOut,
    NotificationUnreadCount,
)
from app.notification.services import NotificationService, NotificationStore

router = APIRouter(tags=["notifications"])


def _target_from_payload(payload: dict) -> dict:
    """Extract the user's targeting fields from the verified JWT payload."""
    return {
        "organization_id": int(payload.get("organization_id") or payload.get("sub") or 1),
        "user_id": int(payload.get("user_id") or payload.get("sub") or 0) or None,
        "role": payload.get("role"),
        "name": payload.get("full_name") or payload.get("email"),
    }


@router.get("/notifications", response_model=dict)
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


@router.get("/notifications/history", response_model=NotificationListResponse)
async def get_notification_history(
    limit: int = 50,
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_token_payload),
):
    target = _target_from_payload(payload)
    store = NotificationStore(db)
    items = await store.list_for_user(
        limit=min(limit, 100),
        only_unread=unread_only,
        **{k: v for k, v in target.items() if k != "organization_id"},
    )
    unread = await store.unread_count(**target)
    return NotificationListResponse(
        total=len(items),
        unread=unread,
        notifications=[NotificationOut.model_validate(n) for n in items],
    )


@router.get("/notifications/unread-count", response_model=NotificationUnreadCount)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_token_payload),
):
    store = NotificationStore(db)
    return NotificationUnreadCount(unread=await store.unread_count(**_target_from_payload(payload)))


@router.put("/notifications/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_token_payload),
):
    target = _target_from_payload(payload)
    store = NotificationStore(db)
    notif = await store.mark_read(notification_id, **target)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return NotificationOut.model_validate(notif)


@router.put("/notifications/read-all", response_model=dict)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_token_payload),
):
    target = _target_from_payload(payload)
    store = NotificationStore(db)
    updated = await store.mark_all_read(
        organization_id=target.pop("organization_id"),
        **target,
    )
    return {"updated": updated}
