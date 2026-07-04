from fastapi import APIRouter, Depends, HTTPException

from app.database import conn
from app.auth.permissions import require_permission
from pydantic import BaseModel
from app.schemas.settings import CompanySettings, BrandingSettings, NotificationSettings, ChangePassword
from app.utils import hash, verify
from app.security import encrypt_password, decrypt_password
from app.services.audit import log_action

router = APIRouter(prefix="/settings", tags=["Settings"])

_MASK = "********"


def _resolve_secret(new_val: str | None, existing_encrypted: str | None) -> str | None:
    """
    If the frontend sent the mask sentinel, keep the existing encrypted value.
    If it sent a real value, encrypt it.
    If it sent None/empty, store NULL (user cleared it).
    """
    if new_val == _MASK:
        return existing_encrypted
    if new_val:
        return encrypt_password(new_val)
    return None


def _mask_row(row: dict, *fields) -> dict:
    """Replace sensitive fields with the mask sentinel if they have a value."""
    if not row:
        return row
    for f in fields:
        if row.get(f):
            row[f] = _MASK
    return row


@router.post("/organization")
def save_organization(settings: CompanySettings, current_user: int = Depends(require_permission('settings.manage'))):
    try:
        with conn.cursor() as cursor:
            # Fetch existing secrets so we can preserve them if the frontend sent masks
            cursor.execute(
                "SELECT smtp_password, razorpay_key_secret, razorpay_webhook_secret "
                "FROM company_settings WHERE owner_id = %s",
                (current_user,),
            )
            existing = cursor.fetchone() or {}

            enc_smtp_password       = _resolve_secret(settings.smtp_password,       existing.get("smtp_password"))
            enc_razorpay_key_secret = _resolve_secret(settings.razorpay_key_secret, existing.get("razorpay_key_secret"))
            enc_razorpay_webhook    = _resolve_secret(settings.razorpay_webhook_secret, existing.get("razorpay_webhook_secret"))

            cursor.execute(
                """
                INSERT INTO company_settings
                (company_name, gst_number, industry, phone, email, address, state, website,
                 smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email,
                 razorpay_key_id, razorpay_key_secret, razorpay_webhook_secret,
                 owner_id)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (owner_id)
                DO UPDATE SET
                    company_name            = EXCLUDED.company_name,
                    gst_number              = EXCLUDED.gst_number,
                    industry                = EXCLUDED.industry,
                    phone                   = EXCLUDED.phone,
                    email                   = EXCLUDED.email,
                    address                 = EXCLUDED.address,
                    state                   = EXCLUDED.state,
                    website                 = EXCLUDED.website,
                    smtp_host               = EXCLUDED.smtp_host,
                    smtp_port               = EXCLUDED.smtp_port,
                    smtp_username           = EXCLUDED.smtp_username,
                    smtp_password           = EXCLUDED.smtp_password,
                    smtp_from_email         = EXCLUDED.smtp_from_email,
                    razorpay_key_id         = EXCLUDED.razorpay_key_id,
                    razorpay_key_secret     = EXCLUDED.razorpay_key_secret,
                    razorpay_webhook_secret = EXCLUDED.razorpay_webhook_secret
                """,
                (
                    settings.company_name, settings.gst_number, settings.industry,
                    settings.phone, settings.email, settings.address, settings.state,
                    settings.website, settings.smtp_host, settings.smtp_port,
                    settings.smtp_username, enc_smtp_password, settings.smtp_from_email,
                    settings.razorpay_key_id, enc_razorpay_key_secret, enc_razorpay_webhook,
                    current_user,
                ),
            )
        conn.commit()
        log_action(
            current_user,
            current_user,
            "organization_updated",
            "settings",
            "organization",
            "Organization settings updated",
            {
                "company_name": settings.company_name,
                "gst_number_set": bool(settings.gst_number),
                "email": settings.email,
                "state": settings.state,
            },
        )
        log_action(
            current_user,
            current_user,
            "smtp_updated",
            "settings",
            "smtp",
            "SMTP settings updated",
            {
                "smtp_host": settings.smtp_host,
                "smtp_port": settings.smtp_port,
                "smtp_username_set": bool(settings.smtp_username),
                "smtp_password_set": bool(enc_smtp_password),
                "smtp_from_email": settings.smtp_from_email,
            },
        )
        log_action(
            current_user,
            current_user,
            "razorpay_updated",
            "settings",
            "razorpay",
            "Razorpay settings updated",
            {
                "razorpay_key_id_set": bool(settings.razorpay_key_id),
                "razorpay_key_secret_set": bool(enc_razorpay_key_secret),
                "razorpay_webhook_secret_set": bool(enc_razorpay_webhook),
            },
        )
        return {"message": "Organization settings saved"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/organization")
def get_organization(current_user: int = Depends(require_permission('settings.manage'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM company_settings WHERE owner_id = %s", (current_user,))
            settings = cursor.fetchone()
        if settings:
            settings = dict(settings)
            settings = _mask_row(settings, "smtp_password", "razorpay_key_secret", "razorpay_webhook_secret")
        return {"data": settings} if settings else {"data": None, "message": "No settings found"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/branding")
def save_branding(settings: BrandingSettings, current_user: int = Depends(require_permission('settings.manage'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO branding_settings (logo_url, primary_color, accent_color, invoice_footer, payment_terms, invoice_email_subject, invoice_email_body, owner_id)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (owner_id)
                DO UPDATE SET
                    logo_url                = EXCLUDED.logo_url,
                    primary_color           = EXCLUDED.primary_color,
                    accent_color            = EXCLUDED.accent_color,
                    invoice_footer          = EXCLUDED.invoice_footer,
                    payment_terms           = EXCLUDED.payment_terms,
                    invoice_email_subject   = EXCLUDED.invoice_email_subject,
                    invoice_email_body      = EXCLUDED.invoice_email_body
                """,
                (settings.logo_url, settings.primary_color, settings.accent_color, settings.invoice_footer,
                 settings.payment_terms, settings.invoice_email_subject, settings.invoice_email_body, current_user),
            )
        conn.commit()
        log_action(
            current_user,
            current_user,
            "branding_updated",
            "settings",
            "branding",
            "Branding settings updated",
            {
                "logo_url_set": bool(settings.logo_url),
                "primary_color": settings.primary_color,
                "accent_color": settings.accent_color,
                "invoice_footer_set": bool(settings.invoice_footer),
                "payment_terms_set": bool(settings.payment_terms),
                "invoice_email_template_set": bool(settings.invoice_email_subject or settings.invoice_email_body),
            },
        )
        return {"message": "Branding settings saved"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/branding")
def get_branding(current_user: int = Depends(require_permission('settings.manage'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM branding_settings WHERE owner_id = %s", (current_user,))
            settings = cursor.fetchone()
        return {"data": settings} if settings else {"data": None, "message": "No branding settings found"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


class TestEmailRequest(BaseModel):
    pass


@router.post("/test-email")
def test_email(current_user: int = Depends(require_permission('settings.manage'))):
    from app.email_utils.email_utils import send_email, EmailNotConfigured

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT email, smtp_from_email FROM company_settings WHERE owner_id = %s", (current_user,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=400, detail="Company settings not found.")
            to_email = row["email"] or row["smtp_from_email"]
            if not to_email:
                raise HTTPException(status_code=400, detail="Company email is missing. Please set your company email in the Organization tab.")
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))

    try:
        send_email(
            owner_id=current_user,
            to_email=to_email,
            subject="VexBill SMTP Configuration Test",
            body="If you are receiving this email, your SMTP configuration is successfully working for VexBill.",
            attachments=None,
        )
        return {"message": f"Test email sent successfully to {to_email}"}
    except EmailNotConfigured as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(exc)}")


@router.post("/notifications")
def save_notifications(settings: NotificationSettings, current_user: int = Depends(require_permission('settings.manage'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO notification_settings (invoice_notifications, payment_reminders, low_stock_alerts, weekly_reports, owner_id)
                VALUES (%s,%s,%s,%s,%s)
                ON CONFLICT (owner_id)
                DO UPDATE SET
                    invoice_notifications = EXCLUDED.invoice_notifications,
                    payment_reminders     = EXCLUDED.payment_reminders,
                    low_stock_alerts      = EXCLUDED.low_stock_alerts,
                    weekly_reports        = EXCLUDED.weekly_reports
                """,
                (settings.invoice_notifications, settings.payment_reminders, settings.low_stock_alerts,
                 settings.weekly_reports, current_user),
            )
        conn.commit()
        return {"message": "Notification settings saved"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications")
def get_notifications(current_user: int = Depends(require_permission('settings.manage'))):
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM notification_settings WHERE owner_id = %s", (current_user,))
            settings = cursor.fetchone()
        return {"data": settings} if settings else {"data": None, "message": "No notification settings found"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/change-password")
def change_password(password_data: ChangePassword, current_user: int = Depends(require_permission('settings.manage'))):
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match")
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT password FROM users WHERE id = %s", (current_user,))
            user = cursor.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            if not verify(password_data.current_password, user["password"]):
                raise HTTPException(status_code=400, detail="Current password is incorrect")
            cursor.execute("UPDATE users SET password = %s WHERE id = %s", (hash(password_data.new_password), current_user))
        conn.commit()
        return {"message": "Password updated successfully"}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))
