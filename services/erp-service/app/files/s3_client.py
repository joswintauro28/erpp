"""RustFS S3 client (Boto3) for presigned URL generation and object operations.

All sync Boto3 calls are wrapped in asyncio.to_thread() so they do not
block the FastAPI event loop.  RustFS is S3-compatible, so the standard
AWS SDK for Python (Boto3) works with no RustFS-specific code.
"""

import asyncio
import hashlib
import logging
import uuid
from datetime import timedelta

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Singleton clients (created once per process)
# ---------------------------------------------------------------------------

_client = None
_public_client = None

_BOTO_CONFIG = BotoConfig(signature_version="s3v4")


def get_s3_client():
    """Operational client — connects to RustFS via internal Docker hostname."""
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=f"http://{settings.RUSTFS_ENDPOINT}",
            aws_access_key_id=settings.RUSTFS_ACCESS_KEY,
            aws_secret_access_key=settings.RUSTFS_SECRET_KEY,
            region_name="us-east-1",
            config=_BOTO_CONFIG,
        )
    return _client


def _get_public_client():
    """URL-generation client — configured with the public endpoint so
    presigned URLs are signed for the host the browser will actually use.
    S3v4 signatures include the Host header; if the signed host doesn't
    match the request host, RustFS returns 403 Forbidden.

    The ``region`` is set to skip the region-probe HTTP call (which would
    fail from inside Docker since the public endpoint isn't reachable from
    the container network).
    """
    global _public_client
    if _public_client is None:
        from urllib.parse import urlparse
        public = urlparse(settings.RUSTFS_PUBLIC_URL)
        host = public.hostname or "localhost"
        port = public.port or (443 if public.scheme == "https" else 80)
        scheme = public.scheme
        endpoint_url = f"{scheme}://{host}:{port}" if port not in (80, 443) else f"{scheme}://{host}"
        _public_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.RUSTFS_ACCESS_KEY,
            aws_secret_access_key=settings.RUSTFS_SECRET_KEY,
            region_name="us-east-1",
            config=_BOTO_CONFIG,
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
    client = get_s3_client()

    def _check():
        try:
            client.head_bucket(Bucket=bucket)
        except ClientError:
            client.create_bucket(Bucket=bucket)

    await asyncio.to_thread(_check)


# ---------------------------------------------------------------------------
# Presigned URL generation
# ---------------------------------------------------------------------------

PRESIGNED_PUT_EXPIRY = 300   # 5 minutes in seconds
PRESIGNED_GET_EXPIRY = 300


async def generate_put_url(
    bucket: str,
    object_key: str,
    content_type: str,
    expiry: int = PRESIGNED_PUT_EXPIRY,
) -> str:
    """Generate a presigned PUT URL for direct client upload to RustFS.

    Uses the public client so the S3v4 signature matches the host the
    browser will use.  The operational client (``get_s3_client()``)
    connects to the internal Docker endpoint and is used for object
    operations like head_object and delete_object.
    """
    client = _get_public_client()

    def _generate():
        return client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": bucket,
                "Key": object_key,
                "ContentType": content_type,
            },
            ExpiresIn=expiry,
        )

    return await asyncio.to_thread(_generate)


async def generate_get_url(
    bucket: str,
    object_key: str,
    expiry: int = PRESIGNED_GET_EXPIRY,
) -> str:
    """Generate a presigned GET URL for direct client download from RustFS."""
    client = _get_public_client()

    def _generate():
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": object_key},
            ExpiresIn=expiry,
        )

    return await asyncio.to_thread(_generate)


async def delete_object(bucket: str, object_key: str) -> None:
    """Delete an object from RustFS. Raises ClientError on failure."""
    client = get_s3_client()

    def _delete():
        client.delete_object(Bucket=bucket, Key=object_key)

    try:
        await asyncio.to_thread(_delete)
    except ClientError as exc:
        logger.warning("RustFS delete_object failed for %s/%s: %s", bucket, object_key, exc)
        raise


async def object_exists(bucket: str, object_key: str) -> bool:
    """Check whether an object exists in RustFS."""
    client = get_s3_client()

    def _check():
        try:
            client.head_object(Bucket=bucket, Key=object_key)
            return True
        except ClientError:
            return False

    return await asyncio.to_thread(_check)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sanitize_path_component(name: str) -> str:
    """Sanitise a string so it is safe as a single directory/filename component."""
    safe = "".join(c if c.isalnum() or c in ".-_" else "_" for c in name)
    return safe.strip("_") or "uncategorised"


def make_object_key(original_name: str, client_name: str | None = None, owner_type: str | None = None) -> str:
    """Generate a unique, path-safe object key.

    When *client_name* is provided the key is hierarchical::

        <client_name>/<owner_type>/<uuid>_<sanitised_name>

    When *client_name* is ``None`` the key falls back to::

        <owner_type>/<uuid>_<sanitised_name>

    If *owner_type* is also ``None`` the legacy flat layout is used::

        <uuid>_<sanitised_name>
    """
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in original_name)
    filename = f"{uuid.uuid4().hex}_{safe_name}"

    segments: list[str] = []
    if client_name:
        segments.append(_sanitize_path_component(client_name))
    if owner_type:
        segments.append(_sanitize_path_component(owner_type))

    if segments:
        return "/".join(segments) + "/" + filename
    return filename


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
