"""MinIO client wrapper for presigned URL generation and object operations.

All sync MinIO SDK calls are wrapped in asyncio.to_thread() so they do not
block the FastAPI event loop.
"""

import asyncio
import hashlib
import logging
import uuid
from datetime import timedelta

from minio import Minio
from minio.error import S3Error

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Singleton clients (created once per process)
# ---------------------------------------------------------------------------

_client: Minio | None = None
_public_client: Minio | None = None


def get_minio_client() -> Minio:
    """Operational client — connects to MinIO via internal Docker hostname."""
    global _client
    if _client is None:
        _client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ROOT_USER,
            secret_key=settings.MINIO_ROOT_PASSWORD,
            secure=settings.MINIO_SECURE,
        )
    return _client


def _get_public_client() -> Minio:
    """URL-generation client — configured with the public endpoint so
    presigned URLs are signed for the host the browser will actually use.
    S3v4 signatures include the Host header; if the signed host doesn't
    match the request host, MinIO returns 403 Forbidden.

    The ``region`` parameter is set explicitly so the SDK skips its
    region-probe HTTP call (which would fail from inside Docker since
    the public endpoint isn't reachable from the container network).
    """
    global _public_client
    if _public_client is None:
        from urllib.parse import urlparse
        public = urlparse(settings.MINIO_PUBLIC_URL)
        host = public.hostname or "localhost"
        port = public.port or (443 if public.scheme == "https" else 80)
        secure = public.scheme == "https"
        endpoint = f"{host}:{port}" if port not in (80, 443) else host
        _public_client = Minio(
            endpoint,
            access_key=settings.MINIO_ROOT_USER,
            secret_key=settings.MINIO_ROOT_PASSWORD,
            secure=secure,
            region="us-east-1",  # skip region probe
        )
    return _public_client


# ---------------------------------------------------------------------------
# Bucket names (per-domain isolation)
# ---------------------------------------------------------------------------

BUCKET_CRM = "crm-assets"
BUCKET_INV = "inv-docs"
BUCKET_FINANCE = "finance-records"
BUCKET_BACKUPS = "erp-backups"

VALID_BUCKETS = {BUCKET_CRM, BUCKET_INV, BUCKET_FINANCE, BUCKET_BACKUPS}


async def ensure_bucket(bucket: str) -> None:
    """Create the bucket if it doesn't already exist."""
    client = get_minio_client()
    def _check():
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
    await asyncio.to_thread(_check)


# ---------------------------------------------------------------------------
# Presigned URL generation
# ---------------------------------------------------------------------------

PRESIGNED_PUT_EXPIRY = timedelta(minutes=5)
PRESIGNED_GET_EXPIRY = timedelta(minutes=5)


async def generate_put_url(
    bucket: str,
    object_key: str,
    content_type: str,
    expiry: timedelta = PRESIGNED_PUT_EXPIRY,
) -> str:
    """Generate a presigned PUT URL for direct client upload to MinIO.

    Uses the public client so the S3v4 signature matches the host the
    browser will use.  The operational client (``get_minio_client()``)
    connects to the internal Docker endpoint and is used for object
    operations like stat_object and remove_object.
    """
    client = _get_public_client()
    def _generate():
        return client.presigned_put_object(
            bucket,
            object_key,
            expires=expiry,
        )
    return await asyncio.to_thread(_generate)


async def generate_get_url(
    bucket: str,
    object_key: str,
    expiry: timedelta = PRESIGNED_GET_EXPIRY,
) -> str:
    """Generate a presigned GET URL for direct client download from MinIO."""
    client = _get_public_client()
    def _generate():
        return client.presigned_get_object(
            bucket,
            object_key,
            expires=expiry,
        )
    return await asyncio.to_thread(_generate)


async def delete_object(bucket: str, object_key: str) -> None:
    """Delete an object from MinIO."""
    client = get_minio_client()
    def _delete():
        try:
            client.remove_object(bucket, object_key)
        except S3Error as exc:
            logger.warning("MinIO delete_object failed for %s/%s: %s", bucket, object_key, exc)
    await asyncio.to_thread(_delete)


async def object_exists(bucket: str, object_key: str) -> bool:
    """Check whether an object exists in MinIO."""
    client = get_minio_client()
    def _check():
        try:
            client.stat_object(bucket, object_key)
            return True
        except S3Error:
            return False
    return await asyncio.to_thread(_check)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_object_key(original_name: str) -> str:
    """Generate a unique, path-safe object key: ``<uuid>_<sanitised_name>``."""
    safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in original_name)
    return f"{uuid.uuid4().hex}_{safe}"


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
