import os
import smtplib
from email.message import EmailMessage
from typing import Optional, List
from app.database import conn
from app.security import decrypt_password


class EmailNotConfigured(RuntimeError):
    pass


def _smtp_settings(owner_id: int):
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email "
            "FROM company_settings WHERE owner_id = %s",
            (owner_id,),
        )
        row = cursor.fetchone()

    if not row or not row["smtp_username"] or not row["smtp_password"] or not row["smtp_from_email"]:
        raise EmailNotConfigured("SMTP settings are not configured for this account.")

    host = row["smtp_host"] or "smtp.gmail.com"
    port = int(row["smtp_port"] or 465)
    username = row["smtp_username"]
    password = decrypt_password(row["smtp_password"])
    from_email = row["smtp_from_email"]

    if not password:
        raise EmailNotConfigured("Invalid SMTP password encryption state.")

    return host, port, username, password, from_email


def send_email(owner_id: int, to_email: str, subject: str, body: str, attachments: Optional[List[str]] = None, html_body: Optional[str] = None):
    host, port, username, password, from_email = _smtp_settings(owner_id)

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(body)
    
    if html_body:
        msg.add_alternative(html_body, subtype='html')

    if attachments:
        for attachment_path in attachments:
            if not os.path.exists(attachment_path):
                continue
            with open(attachment_path, "rb") as f:
                file_data = f.read()
            msg.add_attachment(
                file_data,
                maintype="application",
                subtype="pdf" if attachment_path.lower().endswith(".pdf") else "octet-stream",
                filename=os.path.basename(attachment_path),
            )

    if port == 465:
        with smtplib.SMTP_SSL(host, port) as smtp:
            smtp.login(username, password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, port) as smtp:
            smtp.starttls()
            smtp.login(username, password)
            smtp.send_message(msg)
