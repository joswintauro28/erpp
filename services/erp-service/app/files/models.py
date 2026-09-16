"""File registry model.

Stores metadata for files uploaded to RustFS. The actual binary content
lives in RustFS; this table tracks provenance, ownership, and enables
cross-domain file queries.
"""

from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FileRecord(Base):
    __tablename__ = "file_records"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)

    # RustFS placement
    bucket: Mapped[str] = mapped_column(sa.String(63), nullable=False)
    object_key: Mapped[str] = mapped_column(sa.String(1024), nullable=False)
    uri: Mapped[str] = mapped_column(sa.String(2048), nullable=False)

    # File metadata
    original_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(sa.String(127), nullable=False)
    size_bytes: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)
    checksum_sha256: Mapped[str | None] = mapped_column(sa.String(64), nullable=True)

    # Ownership
    uploader_id: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    owner_type: Mapped[str] = mapped_column(sa.String(50), nullable=False, index=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
