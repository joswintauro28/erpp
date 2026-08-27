"""
MinIO Object Key Migration Script

Migrates existing flat-key objects (<uuid>_<name>) to client-scoped paths
(<client_name>/<owner_type>/<uuid>_<name>) for all FileRecords in the database.

Usage:
    cd services/erp-service
    PYTHONPATH=. .venv/Scripts/python scripts/migrate_minio_keys.py

Requirements:
    - Running PostgreSQL with erp_db database
    - Running MinIO instance with existing buckets
    - Environment variables: DATABASE_URL, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
"""

import asyncio
import os
import sys
from dataclasses import dataclass

# Add the project root to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from minio import Minio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker


@dataclass
class MigrationStats:
    total: int = 0
    migrated: int = 0
    skipped: int = 0
    errors: int = 0


def get_minio_client() -> Minio:
    """Create a MinIO client from environment variables."""
    endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    secure = os.getenv("MINIO_SECURE", "false").lower() == "true"

    return Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=secure)


async def get_client_name_for_record(session: AsyncSession, owner_type: str, owner_id: int) -> str:
    """
    Resolve the client/account name for a given owner_type and owner_id.
    Falls back to 'general' if not found.
    """
    try:
        if owner_type in ("document", "quotation", "requirement", "sales_order"):
            # CRM entities — get account from the linked record
            table_map = {
                "document": "documents",
                "quotation": "quotations",
                "requirement": "requirements",
                "sales_order": "sales_orders",
            }
            table = table_map.get(owner_type)
            if table:
                result = await session.execute(
                    text(f"SELECT account FROM {table} WHERE id = :id LIMIT 1"),
                    {"id": owner_id},
                )
                row = result.fetchone()
                if row and row[0]:
                    return row[0].strip()
        elif owner_type == "invoice":
            result = await session.execute(
                text("SELECT client_name FROM invoices WHERE id = :id LIMIT 1"),
                {"id": owner_id},
            )
            row = result.fetchone()
            if row and row[0]:
                return row[0].strip()
    except Exception:
        pass

    return "general"


async def migrate_keys():
    """Main migration function."""
    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://datavex:datavex@localhost:5432/erp_db",
    )

    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    minio = get_minio_client()
    stats = MigrationStats()

    async with async_session() as session:
        # Fetch all file records
        result = await session.execute(
            text("SELECT id, bucket, object_key, uri, owner_type, owner_id FROM file_records ORDER BY id")
        )
        records = result.fetchall()

        stats.total = len(records)
        print(f"\n{'='*60}")
        print(f"MinIO Object Key Migration")
        print(f"{'='*60}")
        print(f"Total records to process: {stats.total}")
        print(f"{'='*60}\n")

        for record in records:
            record_id, bucket, object_key, uri, owner_type, owner_id = record

            # Skip if already has client-scoped path (contains /)
            if "/" in object_key:
                stats.skipped += 1
                continue

            try:
                # Resolve client name
                client_name = await get_client_name_for_record(session, owner_type, owner_id or 0)
                # Sanitize client name for use as path segment
                safe_client = "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in client_name)
                safe_client = safe_client.strip().replace(" ", "_") or "general"

                # Construct new key
                new_key = f"{safe_client}/{owner_type}/{object_key}"

                # Check if source object exists in MinIO
                if not minio.stat_object(bucket, object_key):
                    print(f"  [SKIP] Record #{record_id}: object not found in MinIO: {object_key}")
                    stats.skipped += 1
                    continue

                # Copy object to new key
                minio.copy_object(
                    bucket,
                    new_key,
                    f"/{bucket}/{object_key}",
                )

                # Update database
                new_uri = f"s3://{bucket}/{new_key}"
                await session.execute(
                    text("UPDATE file_records SET object_key = :new_key, uri = :new_uri WHERE id = :id"),
                    {"new_key": new_key, "new_uri": new_uri, "id": record_id},
                )

                # Delete old object
                minio.remove_object(bucket, object_key)

                stats.migrated += 1
                print(f"  [OK] Record #{record_id}: {object_key} → {new_key}")

            except Exception as e:
                stats.errors += 1
                print(f"  [ERR] Record #{record_id}: {e}")

        await session.commit()

    print(f"\n{'='*60}")
    print(f"Migration Complete")
    print(f"{'='*60}")
    print(f"  Total:     {stats.total}")
    print(f"  Migrated:  {stats.migrated}")
    print(f"  Skipped:   {stats.skipped}")
    print(f"  Errors:    {stats.errors}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(migrate_keys())
