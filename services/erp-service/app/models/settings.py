import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CompanySetting(Base):
    __tablename__ = "company_settings"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("users.id"), unique=True, nullable=False)
    company_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(sa.String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    state: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    gst_number: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    industry: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)


class BrandingSetting(Base):
    __tablename__ = "branding_settings"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("users.id"), unique=True, nullable=False)
    logo_url: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)
    primary_color: Mapped[str | None] = mapped_column(sa.String(50), nullable=True)
    accent_color: Mapped[str | None] = mapped_column(sa.String(50), nullable=True)
    invoice_footer: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)


class NotificationSetting(Base):
    __tablename__ = "notification_settings"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("users.id"), unique=True, nullable=False)
    invoice_notifications: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    payment_reminders: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    low_stock_alerts: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    weekly_reports: Mapped[bool] = mapped_column(sa.Boolean, default=False)


class WorkflowSettings(Base):
    __tablename__ = "workflow_settings"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("users.id"), unique=True, nullable=False)
    send_upcoming_invoice_reminders: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    send_overdue_reminders: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    notify_low_stock: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    created_at: Mapped[str] = mapped_column(sa.String(50), default="now")
