from sqlalchemy import Column, Integer, String, Float, Text
from app.database import Base


class QuotationApproval(Base):
    """CPQ internal approval overlay (S5/S6) on top of the billing quotation.

    Billing owns the external quotation lifecycle (draft -> sent -> accepted/
    rejected/expired). This table owns the *internal* approval state that
    gates quotes with a discount above the enterprise threshold:

        Draft -> Pending Approval -> Approved | Rejected

    `quote_id` is the billing-service quotation id; `quote_number` is the
    canonical QT-YYYYMM-NNNN document number.
    """

    __tablename__ = "quotation_approvals"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, default=1, nullable=False, index=True)
    quote_id = Column(Integer, nullable=False, index=True)
    quote_number = Column(String, nullable=True, index=True)
    account = Column(String, nullable=True)

    subtotal = Column(Float, default=0.0, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    discount_pct = Column(Float, default=0.0, nullable=False)
    approval_threshold = Column(Float, default=15.0, nullable=False)

    approval_status = Column(
        String, default="Draft", nullable=False, server_default="Draft"
    )  # Draft | Pending Approval | Approved | Rejected
    requested_by = Column(String, nullable=True)
    approved_by = Column(String, nullable=True)
    decided_at = Column(String, nullable=True)
    created_at = Column(String, nullable=True)
