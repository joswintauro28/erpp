"""File upload / download / management endpoints.

Uses the presigned URL pattern: the backend never handles binary data.
Files go directly between the client and MinIO.
"""

import logging
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import RedirectResponse

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_token_payload
from app.files import minio_client as mc
from app.files.models import FileRecord
from app.files.schemas import (
    ConfirmUploadRequest,
    DownloadResponse,
    FileRecordOut,
    UploadRequest,
    UploadResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/files", tags=["files"])

# MIME type validation
# Fixed: use image/[a-z0-9.+_-]+ instead of image/\* which matched literal "image/*"
_MIME_PATTERN = re.compile(
    r"^(image/[a-z0-9.+_-]+|application/pdf|text/csv|"
    r"application/vnd\.ms-excel|"
    r"application/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|"
    r"application/msword|"
    r"application/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$",
    re.IGNORECASE,
)

# Pending record TTL — abandoned uploads older than this are eligible for cleanup
_PENDING_TTL_MINUTES = 30


def _validate_mime(mime: str) -> None:
    if not _MIME_PATTERN.match(mime):
        raise HTTPException(
            status_code=400,
            detail=f"File type '{mime}' is not allowed. "
            "Accepted: images, PDF, CSV, Excel, Word.",
        )


def _validate_size(size: int) -> None:
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if size > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds the {settings.MAX_FILE_SIZE_MB}MB limit.",
        )


def _validate_bucket(bucket: str) -> None:
    if bucket not in mc.VALID_BUCKETS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid bucket '{bucket}'. "
            f"Valid buckets: {', '.join(sorted(mc.VALID_BUCKETS))}",
        )


# ---------------------------------------------------------------------------
# Helper: scope a query to the caller's organization to prevent IDOR
# ---------------------------------------------------------------------------

def _org_filter(stmt, payload: dict):
    """Add organization_id filter to prevent cross-tenant file access."""
    org_id = payload.get("organization_id")
    if org_id is not None:
        stmt = stmt.where(FileRecord.organization_id == org_id)
    return stmt


# ---------------------------------------------------------------------------
# 1. Request presigned PUT URL
# ---------------------------------------------------------------------------


@router.post("/upload-request", response_model=UploadResponse)
async def request_upload(
    body: UploadRequest,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """Validate the request, generate a presigned PUT URL, and create a
    pending FileRecord. The client then uploads directly to MinIO."""

    _validate_mime(body.mime_type)
    _validate_size(body.size_bytes)
    _validate_bucket(body.bucket)

    org_id = payload.get("organization_id", 1)
    user_id = payload["user_id"]

    # Generate unique object key
    object_key = mc.make_object_key(body.original_name)
    uri = f"s3://{body.bucket}/{object_key}"

    # Create DB record (pending — not confirmed until POST confirm-upload)
    record = FileRecord(
        organization_id=org_id,
        bucket=body.bucket,
        object_key=object_key,
        uri=uri,
        original_name=body.original_name,
        mime_type=body.mime_type,
        size_bytes=body.size_bytes,
        uploader_id=user_id,
        owner_type=body.owner_type,
        owner_id=body.owner_id,
    )
    db.add(record)
    await db.flush()

    # Generate presigned PUT URL (async-wrapped)
    upload_url = await mc.generate_put_url(
        bucket=body.bucket,
        object_key=object_key,
        content_type=body.mime_type,
    )

    return UploadResponse(
        file_id=record.id,
        upload_url=upload_url,
        object_key=object_key,
        bucket=body.bucket,
    )


# ---------------------------------------------------------------------------
# 2. Confirm upload (client has PUT the file to MinIO)
# ---------------------------------------------------------------------------


@router.post("/confirm-upload", response_model=FileRecordOut)
async def confirm_upload(
    body: ConfirmUploadRequest,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """Client calls this after successfully uploading the file to MinIO.
    We verify the object exists and return the final file record."""

    stmt = _org_filter(
        select(FileRecord).where(FileRecord.id == body.file_id), payload
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="File record not found")

    # Verify the object actually landed in MinIO (async-wrapped)
    if not await mc.object_exists(record.bucket, record.object_key):
        raise HTTPException(
            status_code=400,
            detail="File not found in storage. Please retry the upload.",
        )

    # Mark record as confirmed by setting a non-null checksum.
    # The cleanup endpoint uses checksum_sha256 IS NULL to find pending records,
    # so this prevents confirmed uploads from being garbage-collected.
    if record.checksum_sha256 is None:
        record.checksum_sha256 = "confirmed"
        await db.flush()

    return record


# ---------------------------------------------------------------------------
# 3. Get file metadata
# ---------------------------------------------------------------------------


@router.get("/{file_id}", response_model=FileRecordOut)
async def get_file(
    file_id: int,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db),
):
    stmt = _org_filter(
        select(FileRecord).where(FileRecord.id == file_id), payload
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    return record


# ---------------------------------------------------------------------------
# 4. Download file — returns presigned URL as JSON (for programmatic use)
# ---------------------------------------------------------------------------


@router.get("/{file_id}/download", response_model=DownloadResponse)
async def download_file(
    file_id: int,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """Generate a presigned GET URL for the client to download directly."""

    stmt = _org_filter(
        select(FileRecord).where(FileRecord.id == file_id), payload
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    download_url = await mc.generate_get_url(
        bucket=record.bucket,
        object_key=record.object_key,
    )

    return DownloadResponse(download_url=download_url)


# ---------------------------------------------------------------------------
# 5. Stream file — 302 redirect to presigned URL (for browser downloads)
# ---------------------------------------------------------------------------


@router.get("/{file_id}/stream")
async def stream_file(
    file_id: int,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """Redirect to a presigned GET URL so browsers can download directly.
    This avoids the JSON-wrapping issue of the /download endpoint."""

    stmt = _org_filter(
        select(FileRecord).where(FileRecord.id == file_id), payload
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    download_url = await mc.generate_get_url(
        bucket=record.bucket,
        object_key=record.object_key,
    )

    return RedirectResponse(url=download_url, status_code=302)


# ---------------------------------------------------------------------------
# 6. Delete file
# ---------------------------------------------------------------------------


@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """Delete a file from MinIO and remove its registry record."""

    stmt = _org_filter(
        select(FileRecord).where(FileRecord.id == file_id), payload
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    # Delete from MinIO (async-wrapped)
    await mc.delete_object(record.bucket, record.object_key)

    # Delete from DB
    await db.delete(record)

    return {"detail": "File deleted"}


# ---------------------------------------------------------------------------
# 7. List files by owner
# ---------------------------------------------------------------------------


@router.get("", response_model=list[FileRecordOut])
async def list_files(
    owner_type: str = Query(..., max_length=50),
    owner_id: int = Query(..., gt=0),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """List all files attached to a specific entity."""

    stmt = (
        select(FileRecord)
        .where(FileRecord.owner_type == owner_type, FileRecord.owner_id == owner_id)
    )
    stmt = _org_filter(stmt, payload)
    stmt = stmt.order_by(FileRecord.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# 8. Cleanup abandoned pending uploads (internal / cron)
# ---------------------------------------------------------------------------


@router.post("/cleanup-pending")
async def cleanup_pending(
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """Delete pending FileRecords older than the TTL that were never confirmed.
    Intended for periodic cleanup (cron job or admin trigger).
    Only cleans up pending records belonging to the caller's organization."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=_PENDING_TTL_MINUTES)
    stmt = select(FileRecord).where(
        FileRecord.created_at < cutoff,
        FileRecord.checksum_sha256.is_(None),  # pending records never got checksum
    )
    stmt = _org_filter(stmt, payload)
    result = await db.execute(stmt)
    orphaned = list(result.scalars().all())

    deleted = 0
    for record in orphaned:
        await mc.delete_object(record.bucket, record.object_key)
        await db.delete(record)
        deleted += 1

    return {"detail": f"Cleaned up {deleted} abandoned upload(s)"}
