from datetime import date, datetime, timedelta
from datetime import timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.billing_client import get_invoices, get_payments_metrics
from app.integrations.crm_client import get_customers
from app.integrations.inventory_client import get_low_stock_products as get_inv_low_stock
from app.notification.models import Notification
from app.notification.schemas import NotificationCreate


class NotificationStore:
    """DB-backed persistence + read model for user notifications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: NotificationCreate) -> Notification:
        notif = Notification(
            organization_id=data.organization_id,
            user_id=data.user_id,
            role=data.role,
            target_name=data.target_name,
            title=data.title,
            message=data.message,
            type=data.type,
            module_source=data.module_source,
            event=data.event,
            entity_ref=data.entity_ref,
        )
        self.db.add(notif)
        await self.db.flush()
        return notif

    async def list_for_user(
        self,
        *,
        organization_id: int,
        user_id: int | None = None,
        role: str | None = None,
        name: str | None = None,
        limit: int = 50,
        only_unread: bool = False,
    ) -> list[Notification]:
        """Return notifications targeted at this user: their own, their role,
        or a name match on their full name."""
        stmt = select(Notification).where(Notification.organization_id == organization_id)
        or_conditions = []
        if user_id is not None:
            or_conditions.append(Notification.user_id == user_id)
        if role:
            or_conditions.append(Notification.role == role)
        if name:
            or_conditions.append(Notification.target_name.ilike(f"%{name}%"))
        if not or_conditions:
            return []
        from sqlalchemy import or_
        stmt = stmt.where(or_(*or_conditions))
        if only_unread:
            stmt = stmt.where(Notification.read_status.is_(False))
        stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def unread_count(self, *, organization_id: int, **target) -> int:
        items = await self.list_for_user(organization_id=organization_id, only_unread=True, **target)
        return len(items)

    async def mark_read(
        self,
        notification_id: int,
        *,
        organization_id: int,
        user_id: int | None = None,
        role: str | None = None,
        name: str | None = None,
    ) -> Notification | None:
        """Mark one notification read, but only if it is targeted at the caller.

        Prevents IDOR: a user in the same org must not mark another user's
        notification read by guessing ids.
        """
        stmt = select(Notification).where(
            Notification.id == notification_id,
            Notification.organization_id == organization_id,
        )
        or_conditions = []
        if user_id is not None:
            or_conditions.append(Notification.user_id == user_id)
        if role:
            or_conditions.append(Notification.role == role)
        if name:
            or_conditions.append(Notification.target_name.ilike(f"%{name}%"))
        if or_conditions:
            from sqlalchemy import or_
            stmt = stmt.where(or_(*or_conditions))
        result = await self.db.execute(stmt)
        notif = result.scalar_one_or_none()
        if not notif:
            return None
        notif.read_status = True
        notif.read_at = datetime.now(timezone.utc)
        await self.db.flush()
        return notif

    async def mark_all_read(self, *, organization_id: int, **target) -> int:
        items = await self.list_for_user(organization_id=organization_id, **target)
        updated = 0
        for notif in items:
            if not notif.read_status:
                notif.read_status = True
                notif.read_at = datetime.now(timezone.utc)
                updated += 1
        await self.db.flush()
        return updated


class NotificationService:
    def __init__(self, token: str):
        self.token = token

    async def get_notifications(self) -> dict:
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        notifications = []
        summary = {}

        # Overdue invoices via billing-service
        try:
            invoices = await get_invoices(self.token)
            overdue = [inv for inv in invoices if inv.get("status") == "overdue"]
            summary["overdue_invoices"] = len(overdue)
            if overdue:
                notifications.append({
                    "type": "overdue_invoice",
                    "title": f"{len(overdue)} overdue invoice(s)",
                    "severity": "high",
                    "count": len(overdue),
                })

            # Due soon
            due_soon = [
                inv for inv in invoices
                if inv.get("status") in ("sent", "pending")
                and inv.get("due_date")
            ]
            due_soon_filtered = [
                inv for inv in due_soon
                if today <= date.fromisoformat(inv["due_date"]) <= today + timedelta(days=7)
            ]
            summary["due_soon_invoices"] = len(due_soon_filtered)
            if due_soon_filtered:
                notifications.append({
                    "type": "due_soon",
                    "title": f"{len(due_soon_filtered)} invoice(s) due within 7 days",
                    "severity": "medium",
                    "count": len(due_soon_filtered),
                })
        except Exception:
            summary["overdue_invoices"] = 0
            summary["due_soon_invoices"] = 0

        # Low stock via inventory-service
        try:
            low_stock = await get_inv_low_stock(self.token)
            summary["low_stock_items"] = len(low_stock)
            if low_stock:
                notifications.append({
                    "type": "low_stock",
                    "title": f"{len(low_stock)} product(s) below minimum stock level",
                    "severity": "medium",
                    "count": len(low_stock),
                })
        except Exception:
            summary["low_stock_items"] = 0

        # Recent payments via billing-service
        try:
            metrics = await get_payments_metrics(self.token)
            recent_count = metrics.get("thisMonth", 0)
            summary["recent_payments"] = recent_count
            if recent_count > 0:
                notifications.append({
                    "type": "recent_payments",
                    "title": f"{recent_count} payment(s) received this month",
                    "severity": "info",
                    "count": recent_count,
                })
        except Exception:
            summary["recent_payments"] = 0

        # New clients via CRM service
        try:
            data = await get_customers(self.token)
            customers = data.get("customers", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
            new_clients = sum(
                1 for c in customers
                if c.get("updated_at") and date.fromisoformat(c["updated_at"][:10]) >= seven_days_ago
            )
            summary["new_clients"] = new_clients
            if new_clients > 0:
                notifications.append({
                    "type": "new_clients",
                    "title": f"{new_clients} new client(s) added this week",
                    "severity": "info",
                    "count": new_clients,
                })
        except Exception:
            summary["new_clients"] = 0

        # Inventory low stock from service
        try:
            low_stock_service = await get_inv_low_stock(self.token)
            summary["low_stock_service"] = len(low_stock_service)
        except Exception:
            summary["low_stock_service"] = 0

        return {
            "notifications": notifications,
            "summary": summary,
        }
