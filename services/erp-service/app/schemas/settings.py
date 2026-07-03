from pydantic import BaseModel, EmailStr
from typing import Optional


class CompanySettings(BaseModel):
    company_name: str
    gst_number: Optional[str] = None
    industry: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    state: Optional[str] = None
    website: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    razorpay_webhook_secret: Optional[str] = None


class BrandingSettings(BaseModel):
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    invoice_footer: Optional[str] = None
    payment_terms: Optional[str] = None
    invoice_email_subject: Optional[str] = None
    invoice_email_body: Optional[str] = None


class NotificationSettings(BaseModel):
    invoice_notifications: bool = True
    payment_reminders: bool = True
    low_stock_alerts: bool = True
    weekly_reports: bool = False


class ChangePassword(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str
