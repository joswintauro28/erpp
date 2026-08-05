"""Standardized human-readable document/entity ID generation & validation.

Format: [PREFIX]-[YYYYMM]-[NNNN]   (documents: PO, SO, INV, PAY, CN, DN, ...)
        SN-[SKU]-[NNNN]            (serial numbers, SKU-bound)

Sequences are derived from the maximum existing numeric suffix for the same
prefix + month (optionally scoped to an organization), so numbers are never
reused after deletes.
"""
import re
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Canonical strict patterns
DOC_ID_RE = r"^[A-Z]{2,4}-\d{6}-\d{4}$"
SO_CODE_RE = DOC_ID_RE
PO_ID_RE = DOC_ID_RE
INV_ID_RE = DOC_ID_RE
SN_ID_RE = r"^SN-[A-Za-z0-9._-]+-\d{4,}$"


def month_key(dt: datetime | None = None) -> str:
    return (dt or datetime.now()).strftime("%Y%m")


def format_document_id(prefix: str, month: str | None = None, seq: int = 1) -> str:
    return f"{prefix}-{month or month_key()}-{seq:04d}"


def is_valid_document_id(value: str | None) -> bool:
    return bool(value and re.match(DOC_ID_RE, value))


def is_valid_serial_id(value: str | None) -> bool:
    return bool(value and re.match(SN_ID_RE, value))


async def next_document_id(
    db: AsyncSession,
    model,
    prefix: str,
    column: str = "order_number",
    organization_id: int | None = None,
    month: str | None = None,
) -> str:
    """Return the next `{prefix}-{YYYYMM}-{NNNN}` id for the given model/column."""
    month = month or month_key()
    pattern = f"{prefix}-{month}-"
    stmt = select(getattr(model, column)).where(getattr(model, column).like(f"{pattern}%"))
    if organization_id is not None:
        stmt = stmt.where(getattr(model, "organization_id") == organization_id)
    result = await db.execute(stmt)
    seq = 0
    for value in result.scalars().all():
        if value and value.startswith(pattern):
            tail = value[len(pattern):]
            if tail.isdigit():
                seq = max(seq, int(tail))
    return format_document_id(prefix, month, seq + 1)


async def next_serial_tag(
    db: AsyncSession,
    model,
    sku: str,
    column: str = "serial_number",
    organization_id: int | None = None,
) -> str:
    """Return the next `SN-{SKU}-{NNNN}` serial tag bound to the given SKU."""
    pattern = f"SN-{sku}-"
    stmt = select(getattr(model, column)).where(getattr(model, column).like(f"{pattern}%"))
    if organization_id is not None:
        stmt = stmt.where(getattr(model, "organization_id") == organization_id)
    result = await db.execute(stmt)
    seq = 0
    for value in result.scalars().all():
        if value and value.startswith(pattern):
            tail = value[len(pattern):]
            if tail.isdigit():
                seq = max(seq, int(tail))
    return f"SN-{sku}-{seq + 1:04d}"
