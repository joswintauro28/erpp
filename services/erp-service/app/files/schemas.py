"""Pydantic schemas for the file upload/download API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UploadRequest(BaseModel):
    """Client requests a presigned PUT URL for uploading a file."""
    original_name: str = Field(..., max_length=255)
    mime_type: str = Field(..., max_length=127)
    size_bytes: int = Field(..., gt=0)
    bucket: str = Field(..., max_length=63)
    owner_type: str = Field(..., max_length=50)
    owner_id: int = Field(..., ge=0)  # 0 = not yet linked to an entity (e.g. new quotation upload)
    client_name: str | None = Field(None, max_length=255)  # e.g. "Acme Corp" — used to organise files under <client>/<domain>/ in the bucket


class UploadResponse(BaseModel):
    """Returned to the client so it can upload directly to RustFS."""
    file_id: int
    upload_url: str
    object_key: str
    bucket: str
    expires_in: int = 300  # seconds


class ConfirmUploadRequest(BaseModel):
    """Client confirms the upload is complete after PUTting to RustFS."""
    file_id: int


class FileRecordOut(BaseModel):
    """File metadata returned to the client."""
    id: int
    bucket: str
    object_key: str
    uri: str
    original_name: str
    mime_type: str
    size_bytes: int
    checksum_sha256: Optional[str] = None
    uploader_id: int
    owner_type: str
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DownloadResponse(BaseModel):
    """Presigned GET URL for the client to download directly from RustFS."""
    download_url: str
    expires_in: int = 300  # seconds
