from datetime import datetime

from pydantic import BaseModel, Field


class NotificationCreate(BaseModel):
    """Internal payload used by the event-bus consumer when persisting a
    notification. Target fields are optional — at least one should be set."""

    organization_id: int = 1
    user_id: int | None = None
    role: str | None = None
    permission: str | None = None
    target_name: str | None = None
    title: str
    message: str
    type: str = "INFO"  # INFO | SUCCESS | WARNING | ERROR
    module_source: str = "SYSTEM"  # CRM | BILLING | INVENTORY | SYSTEM
    event: str | None = None
    entity_ref: str | None = None


class NotificationOut(BaseModel):
    id: int
    organization_id: int
    user_id: int | None = None
    role: str | None = None
    permission: str | None = None
    target_name: str | None = None
    title: str
    message: str
    type: str
    module_source: str
    event: str | None = None
    entity_ref: str | None = None
    read_status: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    total: int
    unread: int
    notifications: list[NotificationOut] = Field(default_factory=list)


class NotificationUnreadCount(BaseModel):
    unread: int
