"""MinIO client wrapper for presigned URL generation and object operations."""

import hashlib
import uuid
from datetime import timedelta

from minio import Minio
from minio.error import S3Error

from app.core.config import settings

# ---------------------------------------------------------------------------
# Singleton client (created once per process)
# ---------------------------------------------------------------------------

_client: Minio | None = None


def get_minio_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ROOT_USER,
            secret_key=settings.MINIO_ROOT_PASSWORD,
            secure=settings.MINIO_SECURE,
        )
    return _client


# ---------------------------------------------------------------------------
# Bucket names (per-domain isolation)
# ---------------------------------------------------------------------------

BUCKET_CRM = "crm-assets"
BUCKET_INV = "inv-docs"
BUCKET_FINANCE = "finance-records"
BUCKET_BACKUPS = "erp-backups"

VALID_BUCKETS = {BUCKET_CRM, BUCKET_INV, BUCKET_FINANCE, BUCKET_BACKUPS}


def ensure_bucket(bucket: str) -> None:
    """Create the bucket if it doesn't already exist."""
    client = get_minio_client()
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)


# ---------------------------------------------------------------------------
# Presigned URL generation
# ---------------------------------------------------------------------------

PRESIGNED_PUT_EXPIRY = timedelta(minutes=5)
PRESIGNED_GET_EXPIRY = timedelta(minutes=5)


def generate_put_url(
    bucket: str,
    object_key: str,
    content_type: str,
    expiry: timedelta = PRESIGNED_PUT_EXPIRY,
) -> str:
    """Generate a presigned PUT URL for direct client upload to MinIO."""
    client = get_minio_client()
    return client.presigned_put_object(
        bucket,
        object_key,
        expires=expiry,
        headers={"Content-Type": content_type},
    )


def generate_get_url(
    bucket: str,
    object_key: str,
    expiry: timedelta = PRESIGNED_GET_EXPIRY,
) -> str:
    """Generate a presigned GET URL for direct client download from MinIO."""
    client = get_minio_client()
    return client.presigned_get_object(
        bucket,
        object_key,
        expires=expiry,
    )


def delete_object(bucket: str, object_key: str) -> None:
    """Delete an object from MinIO."""
    client = get_minio_client()
    try:
        client.remove_object(bucket, object_key)
    except S3Error:
        pass  # object may not exist; swallow


def object_exists(bucket: str, object_key: str) -> bool:
    """Check whether an object exists in MinIO."""
    client = get_minio_client()
    try:
        client.stat_object(bucket, object_key)
        return True
    except S3Error:
        return False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_object_key(original_name: str) -> str:
    """Generate a unique, path-safe object key: ``<uuid>_<sanitised_name>``."""
    safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in original_name)
    return f"{uuid.uuid4().hex}_{safe}"


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
