from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="user")
    is_active = Column(Boolean, default=True)
    full_name = Column(String(255))
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255))
    is_system_role = Column(Boolean, default=True)

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(255))
    module = Column(String(100))

class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)

class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=datetime.utcnow)

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    address = Column(Text)
    gst_number = Column(String(100))
    state = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    expected_value = Column(Numeric(12, 2), default=0.00)
    converted_client_id = Column(Integer)
    converted_at = Column(DateTime)
    notes = Column(Text)
    status = Column(String(50), default="New")
    created_at = Column(DateTime, default=datetime.utcnow)

class CompanySetting(Base):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    company_name = Column(String(255), nullable=False)
    state = Column(String(100))
    email = Column(String(255))
    smtp_host = Column(String(255))
    smtp_port = Column(Integer)
    smtp_username = Column(String(255))
    smtp_password = Column(String(255))
    smtp_from_email = Column(String(255))
    razorpay_key_id = Column(String(255))
    razorpay_key_secret = Column(String(255))
    razorpay_webhook_secret = Column(String(255))

class BrandingSetting(Base):
    __tablename__ = "branding_settings"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    logo_url = Column(String(255))
    primary_color = Column(String(50))
    accent_color = Column(String(50))
    invoice_footer = Column(Text)
    payment_terms = Column(Text)
    invoice_email_subject = Column(String(255))
    invoice_email_body = Column(Text)

class NotificationSetting(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    invoice_notifications = Column(Boolean, default=True)
    payment_reminders = Column(Boolean, default=True)
    low_stock_alerts = Column(Boolean, default=True)
    weekly_reports = Column(Boolean, default=True)

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    price = Column(Numeric(12, 2), default=0.00)
    stock = Column(Numeric(12, 2), default=0.00)
    low_stock_threshold = Column(Integer, default=10)
    uses_batch_tracking = Column(Boolean, default=False)
    uses_serial_tracking = Column(Boolean, default=False)
    cost_price = Column(Numeric(12, 2), default=0.00)
    track_inventory = Column(Boolean, default=True)
    costing_method = Column(String(50), default="standard")
    created_at = Column(DateTime, default=datetime.utcnow)

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    invoice_number = Column(String(100))
    amount = Column(Numeric(12, 2), default=0.00)
    issue_date = Column(DateTime, default=datetime.utcnow)
    subtotal = Column(Numeric(12, 2), default=0.00)
    cgst = Column(Numeric(12, 2), default=0.00)
    sgst = Column(Numeric(12, 2), default=0.00)
    igst = Column(Numeric(12, 2), default=0.00)
    tax_total = Column(Numeric(12, 2), default=0.00)
    total = Column(Numeric(12, 2), default=0.00)
    paid_amount = Column(Numeric(12, 2), default=0.00)
    balance_due = Column(Numeric(12, 2), default=0.00)
    gst_treatment = Column(String(50), default="intrastate")
    place_of_supply = Column(String(100))
    notes = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow)
    inventory_applied = Column(Boolean, default=False)
    warehouse_id = Column(Integer)
    status = Column(String(50), default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(50))
    payment_date = Column(DateTime, default=datetime.utcnow)
    reference_id = Column(String(100))
    provider = Column(String(100))
    provider_payment_id = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
