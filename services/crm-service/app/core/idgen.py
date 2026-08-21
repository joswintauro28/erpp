"""Standardized human-readable document/entity ID generation & validation.

Format: [PREFIX]-[YYYYMM]-[NNNN]  (documents: SO, QT, INV, PAY, CN, DN, PO, LD, OP, ...)
        CUST-NNNN                 (customers / accounts)

The monthly sequence is derived from the maximum existing numeric suffix for
the same prefix + month, so numbers are never reused after deletes and remain
stable under concurrent-ish writes within a single DB session.
"""
import re
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

# Canonical strict patterns
DOC_ID_RE = r"^[A-Z]{2,4}-\d{6}-\d{4}$"
CUST_ID_RE = r"^CUST-\d{4,}$"
SO_ID_RE = DOC_ID_RE
QT_ID_RE = DOC_ID_RE

# Entity type key -> document prefix
ENTITY_PREFIXES = {
    "customers": "CUST",
    "contacts": "CO",
    "documents": "DO",
    "leads": "LD",
    "opportunities": "OP",
    "requirements": "RE",
    "sales-orders": "SO",
    "sales": "SA",
    "reports": "RP",
    "ai-assistant": "AI",
}

# Model class -> document prefix (mirrors ENTITY_MODEL_MAP)
MODEL_PREFIXES = {
    "Customer": "CUST",
    "Contact": "CO",
    "Document": "DO",
    "Lead": "LD",
    "Opportunity": "OP",
    "Requirement": "RE",
    "SalesOrder": "SO",
    "Sale": "SA",
    "Report": "RP",
    "AIAssistantLog": "AI",
}


def month_key(dt: datetime | None = None) -> str:
    return (dt or datetime.now()).strftime("%Y%m")


def format_document_id(prefix: str, month: str | None = None, seq: int = 1) -> str:
    return f"{prefix}-{month or month_key()}-{seq:04d}"


async def next_document_id(
    db: AsyncSession,
    model,
    prefix: str,
    month: str | None = None,
    column: str = "id_str",
) -> str:
    """Return the next `{prefix}-{YYYYMM}-{NNNN}` id for the given model/column."""
    month = month or month_key()
    pattern = f"{prefix}-{month}-"
    from sqlalchemy import select

    stmt = select(getattr(model, column)).where(getattr(model, column).like(f"{pattern}%"))
    result = await db.execute(stmt)
    seq = 0
    for value in result.scalars().all():
        if value and value.startswith(pattern):
            tail = value[len(pattern):]
            if tail.isdigit():
                seq = max(seq, int(tail))
    return format_document_id(prefix, month, seq + 1)


async def next_customer_id(db: AsyncSession, model, column: str = "id_str") -> str:
    """Return the next `CUST-NNNN` id (customers / accounts format)."""
    from sqlalchemy import select

    stmt = select(getattr(model, column)).where(getattr(model, column).like("CUST-%"))
    result = await db.execute(stmt)
    seq = 0
    for value in result.scalars().all():
        if value and value.startswith("CUST-"):
            tail = value[len("CUST-"):]
            if tail.isdigit():
                seq = max(seq, int(tail))
    return f"CUST-{seq + 1:04d}"


def is_valid_document_id(value: str | None) -> bool:
    return bool(value and re.match(DOC_ID_RE, value))


def is_valid_customer_id(value: str | None) -> bool:
    return bool(value and re.match(CUST_ID_RE, value))


def is_valid_id_for_prefix(value: str | None, prefix: str) -> bool:
    if not value:
        return False
    if prefix == "CUST":
        return is_valid_customer_id(value)
    return is_valid_document_id(value)
