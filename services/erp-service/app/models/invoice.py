from datetime import datetime, date, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    client_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    invoice_number: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    status: Mapped[str] = mapped_column(sa.String(50), default="draft")
    issue_date: Mapped[date | None] = mapped_column(sa.Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(sa.Date, nullable=True)
    subtotal: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    cgst: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    sgst: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    igst: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    tax_total: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    total: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    paid_amount: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    balance_due: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    gst_treatment: Mapped[str] = mapped_column(sa.String(50), default="intrastate")
    place_of_supply: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner = relationship("User", back_populates="invoices")
    client = relationship("Client", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", lazy="selectin", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", lazy="selectin")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int | None] = mapped_column(sa.Integer, sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    description: Mapped[str] = mapped_column(sa.Text, nullable=False)
    quantity: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False)
    unit_price: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False)
    gst_rate: Mapped[float] = mapped_column(sa.Numeric(5, 2), default=0.00)
    amount: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)

    invoice = relationship("Invoice", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invoice_id: Mapped[int | None] = mapped_column(sa.Integer, sa.ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    amount: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False)
    payment_method: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    payment_date: Mapped[date | None] = mapped_column(sa.Date, nullable=True)
    reference_id: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    status: Mapped[str] = mapped_column(sa.String(50), default="completed")
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    owner = relationship("User", back_populates="payments")
    invoice = relationship("Invoice", back_populates="payments")


class CreditNote(Base):
    __tablename__ = "credit_notes"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invoice_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    credit_note_number: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    amount: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    status: Mapped[str] = mapped_column(sa.String(50), default="issued")
    issue_date: Mapped[date | None] = mapped_column(sa.Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class DebitNote(Base):
    __tablename__ = "debit_notes"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invoice_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    debit_note_number: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    amount: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    status: Mapped[str] = mapped_column(sa.String(50), default="issued")
    issue_date: Mapped[date | None] = mapped_column(sa.Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    client_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    quote_number: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    total: Mapped[float] = mapped_column(sa.Numeric(12, 2), default=0.00)
    status: Mapped[str] = mapped_column(sa.String(50), default="draft")
    issue_date: Mapped[date | None] = mapped_column(sa.Date, nullable=True)
    valid_until: Mapped[date | None] = mapped_column(sa.Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    converted_invoice_id: Mapped[int | None] = mapped_column(
        sa.Integer, sa.ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
