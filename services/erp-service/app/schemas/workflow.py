from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class WorkflowSettingsBase(BaseModel):
    send_upcoming_invoice_reminders: bool = True
    upcoming_reminder_days: int = Field(default=3, gt=0)
    send_due_today_reminders: bool = True
    send_overdue_reminders: bool = True
    overdue_reminder_frequency_days: int = Field(default=7, gt=0)
    auto_email_recurring_invoices: bool = True
    notify_low_stock: bool = True
    send_low_stock_email: bool = False
    send_quotation_expiry_reminders: bool = True
    send_quotation_expiry_email: bool = True
    quotation_expiry_days: int = Field(default=3, gt=0)

class WorkflowSettingsCreate(WorkflowSettingsBase):
    pass

class WorkflowSettingsUpdate(WorkflowSettingsBase):
    pass

class WorkflowSettingsOut(WorkflowSettingsBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
