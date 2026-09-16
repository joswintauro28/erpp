"""
One-time migration: move base64 file data from crm-service DB to RustFS.

Reads file_data/file_name columns from documents, sales, sales_orders,
and quotation notes JSON. Uploads each file to RustFS, creates a FileRecord
in erp_db, then NULLs out the base64 columns.

Usage (from services/crm-service):
    python scripts/migrate_files_to_rustfs.py

Requires .env variables:
    DATABASE_URL          — crm-service async PostgreSQL URL
    ERP_DATABASE_URL      — erp-service async PostgreSQL URL
    RUSTFS_ENDPOINT       — RustFS host:port (e.g. localhost:9000)
    RUSTFS_ACCESS_KEY     — RustFS access key
    RUSTFS_SECRET_KEY     — RustFS secret key
    RUSTFS_SECURE         — "true" or "false" (default false)
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure project root is on sys.path so app.* imports resolve
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv

load_dotenv(PROJECT_ROOT / ".env")

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/erp_crm")
ERP_DATABASE_URL = os.getenv("ERP_DATABASE_URL", "postgresql+asyncpg://postgres:root@localhost:5432/erp_db")
BILLING_DATABASE_URL = os.getenv("BILLING_DATABASE_URL", "postgresql+asyncpg://postgres:root@localhost:5432/erp_billing")

RUSTFS_ENDPOINT = os.getenv("RUSTFS_ENDPOINT", "localhost:9000")
RUSTFS_ACCESS_KEY = os.getenv("RUSTFS_ACCESS_KEY", "datavex-rustfs-admin")
RUSTFS_SECRET_KEY = os.getenv("RUSTFS_SECRET_KEY", "datavex-rustfs-admin")
RUSTFS_SECURE = os.getenv("RUSTFS_SECURE", "false").lower() == "true"

BUCKET = "crm-assets"
OWNER_TYPE = "document"
ORG_ID = 1

MIME_MAP = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

# ---------------------------------------------------------------------------
# Engines & sessions
# ---------------------------------------------------------------------------
crm_engine = create_async_engine(DATABASE_URL, echo=False)
erp_engine = create_async_engine(ERP_DATABASE_URL, echo=False)
billing_engine = create_async_engine(BILLING_DATABASE_URL, echo=False)
CrmSession = sessionmaker(crm_engine, class_=AsyncSession, expire_on_commit=False)
ErpSession = sessionmaker(erp_engine, class_=AsyncSession, expire_on_commit=False)
BillingSession = sessionmaker(billing_engine, class_=AsyncSession, expire_on_commit=False)

# ---------------------------------------------------------------------------
# S3 client (sync — used outside async loop)
# ---------------------------------------------------------------------------
_s3_scheme = "https" if RUSTFS_SECURE else "http"
s3_client = boto3.client(
    "s3",
    endpoint_url=f"{_s3_scheme}://{RUSTFS_ENDPOINT}",
    aws_access_key_id=RUSTFS_ACCESS_KEY,
    aws_secret_access_key=RUSTFS_SECRET_KEY,
    region_name="us-east-1",
    config=BotoConfig(signature_version="s3v4"),
)


def ensure_bucket():
    """Create the target bucket if it doesn't exist."""
    try:
        s3_client.head_bucket(Bucket=BUCKET)
        print(f"[rustfs] Bucket exists: {BUCKET}")
    except ClientError:
        s3_client.create_bucket(Bucket=BUCKET)
        print(f"[rustfs] Created bucket: {BUCKET}")


def upload_to_s3(data: bytes, object_key: str, content_type: str) -> str:
    """Upload bytes to RustFS, return the object URI."""
    s3_client.put_object(
        Bucket=BUCKET,
        Key=object_key,
        Body=data,
        ContentType=content_type,
    )
    uri = f"s3://{BUCKET}/{object_key}"
    return uri


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def make_object_key(original_name: str) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y/%m/%d")
    safe_name = original_name.replace(" ", "_").replace("/", "_")
    return f"{ts}/{safe_name}"


def guess_mime(name: str) -> str:
    ext = Path(name).suffix.lower()
    return MIME_MAP.get(ext, "application/octet-stream")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


async def insert_file_record(
    erp_db: AsyncSession,
    *,
    bucket: str,
    object_key: str,
    uri: str,
    original_name: str,
    mime_type: str,
    size_bytes: int,
    checksum: str,
    uploader_id: int,
    owner_type: str,
    owner_id: int,
) -> int:
    """Insert a file_records row and return the new id."""
    now = datetime.now(timezone.utc)
    result = await erp_db.execute(
        sa.text(
            """
            INSERT INTO file_records
                (organization_id, bucket, object_key, uri, original_name,
                 mime_type, size_bytes, checksum_sha256, uploader_id,
                 owner_type, owner_id, created_at)
            VALUES
                (:org_id, :bucket, :object_key, :uri, :original_name,
                 :mime_type, :size_bytes, :checksum, :uploader_id,
                 :owner_type, :owner_id, :created_at)
            RETURNING id
            """
        ),
        {
            "org_id": ORG_ID,
            "bucket": bucket,
            "object_key": object_key,
            "uri": uri,
            "original_name": original_name,
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "checksum": checksum,
            "uploader_id": uploader_id,
            "owner_type": owner_type,
            "owner_id": owner_id,
            "created_at": now,
        },
    )
    row = result.fetchone()
    await erp_db.commit()
    return row[0]


# ---------------------------------------------------------------------------
# Migration logic
# ---------------------------------------------------------------------------
async def migrate_documents(crm_db: AsyncSession, erp_db: AsyncSession) -> int:
    """Migrate documents with file_data column."""
    result = await crm_db.execute(sa.text("SELECT id, id_str, name, file_data, files FROM documents WHERE file_data IS NOT NULL"))
    rows = result.fetchall()
    count = 0

    for doc_id, id_str, name, file_data, files in rows:
        try:
            data = base64.b64decode(file_data)
            original_name = name or f"document_{doc_id}.bin"
            mime = guess_mime(original_name)
            obj_key = make_object_key(original_name)
            uri = upload_to_s3(data, obj_key, mime)
            checksum = sha256_hex(data)

            file_id = await insert_file_record(
                erp_db,
                bucket=BUCKET,
                object_key=obj_key,
                uri=uri,
                original_name=original_name,
                mime_type=mime,
                size_bytes=len(data),
                checksum=checksum,
                uploader_id=1,
                owner_type=OWNER_TYPE,
                owner_id=doc_id,
            )

            # Clear base64 data, store URI reference
            await crm_db.execute(
                sa.text("UPDATE documents SET file_data = NULL, files = :uri WHERE id = :id"),
                {"id": doc_id, "uri": uri},
            )
            await crm_db.commit()
            count += 1
            print(f"  [document] {id_str or doc_id} -> {uri} (file_record #{file_id})")
        except Exception as e:
            await crm_db.rollback()
            print(f"  [document] SKIP id={doc_id}: {e}")

    return count


async def migrate_sales(crm_db: AsyncSession, erp_db: AsyncSession) -> int:
    """Migrate sales with file_data column."""
    result = await crm_db.execute(sa.text("SELECT id, id_str, account, file_data, file_name FROM sales WHERE file_data IS NOT NULL"))
    rows = result.fetchall()
    count = 0

    for sale_id, id_str, account, file_data, file_name in rows:
        try:
            data = base64.b64decode(file_data)
            original_name = file_name or f"sale_{sale_id}.bin"
            mime = guess_mime(original_name)
            obj_key = make_object_key(original_name)
            uri = upload_to_s3(data, obj_key, mime)
            checksum = sha256_hex(data)

            file_id = await insert_file_record(
                erp_db,
                bucket=BUCKET,
                object_key=obj_key,
                uri=uri,
                original_name=original_name,
                mime_type=mime,
                size_bytes=len(data),
                checksum=checksum,
                uploader_id=1,
                owner_type="sale",
                owner_id=sale_id,
            )

            await crm_db.execute(
                sa.text("UPDATE sales SET file_data = NULL, file_name = NULL WHERE id = :id"),
                {"id": sale_id},
            )
            await crm_db.commit()
            count += 1
            print(f"  [sale] {id_str or sale_id} -> {uri} (file_record #{file_id})")
        except Exception as e:
            await crm_db.rollback()
            print(f"  [sale] SKIP id={sale_id}: {e}")

    return count


async def migrate_sales_orders(crm_db: AsyncSession, erp_db: AsyncSession) -> int:
    """Migrate sales_orders with file_data column."""
    result = await crm_db.execute(sa.text("SELECT id, id_str, account, file_data, file_name FROM sales_orders WHERE file_data IS NOT NULL"))
    rows = result.fetchall()
    count = 0

    for so_id, id_str, account, file_data, file_name in rows:
        try:
            data = base64.b64decode(file_data)
            original_name = file_name or f"so_{so_id}.bin"
            mime = guess_mime(original_name)
            obj_key = make_object_key(original_name)
            uri = upload_to_s3(data, obj_key, mime)
            checksum = sha256_hex(data)

            file_id = await insert_file_record(
                erp_db,
                bucket=BUCKET,
                object_key=obj_key,
                uri=uri,
                original_name=original_name,
                mime_type=mime,
                size_bytes=len(data),
                checksum=checksum,
                uploader_id=1,
                owner_type="sales_order",
                owner_id=so_id,
            )

            await crm_db.execute(
                sa.text("UPDATE sales_orders SET file_data = NULL, file_name = NULL WHERE id = :id"),
                {"id": so_id},
            )
            await crm_db.commit()
            count += 1
            print(f"  [sales_order] {id_str or so_id} -> {uri} (file_record #{file_id})")
        except Exception as e:
            await crm_db.rollback()
            print(f"  [sales_order] SKIP id={so_id}: {e}")

    return count


async def migrate_quotation_notes(billing_db: AsyncSession, erp_db: AsyncSession) -> int:
    """Migrate file_data embedded in quotation notes JSON (billing-service DB).

    The crm-service packs file_data/file_name into the notes JSON before
    forwarding to billing-service. This extracts and migrates them.
    """
    result = await billing_db.execute(
        sa.text("SELECT id, notes FROM quotations WHERE notes IS NOT NULL AND notes LIKE '%file_data%'")
    )
    rows = result.fetchall()
    count = 0

    for quote_id, notes_raw in rows:
        if not notes_raw or not notes_raw.strip().startswith("{"):
            continue
        try:
            notes_dict = json.loads(notes_raw)
        except (json.JSONDecodeError, TypeError):
            continue

        file_data_b64 = notes_dict.get("file_data")
        file_name = notes_dict.get("file_name")
        if not file_data_b64:
            continue

        try:
            data = base64.b64decode(file_data_b64)
            original_name = file_name or f"quotation_{quote_id}.bin"
            mime = guess_mime(original_name)
            obj_key = make_object_key(original_name)
            uri = upload_to_s3(data, obj_key, mime)
            checksum = sha256_hex(data)

            file_id = await insert_file_record(
                erp_db,
                bucket=BUCKET,
                object_key=obj_key,
                uri=uri,
                original_name=original_name,
                mime_type=mime,
                size_bytes=len(data),
                checksum=checksum,
                uploader_id=1,
                owner_type="quotation",
                owner_id=quote_id,
            )

            # Strip file_data/file_name from notes JSON, keep the rest
            notes_dict.pop("file_data", None)
            notes_dict.pop("file_name", None)
            clean_notes = json.dumps(notes_dict) if notes_dict else ""

            await billing_db.execute(
                sa.text("UPDATE quotations SET notes = :notes WHERE id = :id"),
                {"id": quote_id, "notes": clean_notes},
            )
            await billing_db.commit()
            count += 1
            print(f"  [quotation] #{quote_id} -> {uri} (file_record #{file_id})")
        except Exception as e:
            await billing_db.rollback()
            print(f"  [quotation] SKIP id={quote_id}: {e}")

    return count


async def main():
    print("=" * 60)
    print("CRM File Migration: base64 -> RustFS + file_records")
    print("=" * 60)
    print(f"  RustFS:    {RUSTFS_ENDPOINT} (bucket={BUCKET})")
    print(f"  CRM DB:    {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    print(f"  ERP DB:    {ERP_DATABASE_URL.split('@')[-1] if '@' in ERP_DATABASE_URL else ERP_DATABASE_URL}")
    print(f"  Billing DB:{BILLING_DATABASE_URL.split('@')[-1] if '@' in BILLING_DATABASE_URL else BILLING_DATABASE_URL}")
    print()

    ensure_bucket()

    crm_db = CrmSession()
    erp_db = ErpSession()
    billing_db = BillingSession()

    try:
        total = 0
        print("--- Migrating documents ---")
        total += await migrate_documents(crm_db, erp_db)

        print("--- Migrating sales ---")
        total += await migrate_sales(crm_db, erp_db)

        print("--- Migrating sales_orders ---")
        total += await migrate_sales_orders(crm_db, erp_db)

        print("--- Migrating quotation notes ---")
        total += await migrate_quotation_notes(billing_db, erp_db)

        print()
        print(f"Done. Migrated {total} files to RustFS.")
    finally:
        await crm_db.close()
        await erp_db.close()
        await billing_db.close()
        await crm_engine.dispose()
        await erp_engine.dispose()
        await billing_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
