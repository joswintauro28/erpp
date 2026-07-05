from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

SENSITIVE_KEYS = {"password", "secret", "token", "authorization", "cookie", "jwt"}


def sanitize_metadata(metadata: dict | None) -> dict | None:
    if not metadata:
        return metadata
    return {
        k: ("[REDACTED]" if any(s in k.lower() for s in SENSITIVE_KEYS) else v)
        for k, v in metadata.items()
    }


async def log_action(
    db: AsyncSession,
    owner_id: int | None,
    user_id: int | None,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    description: str | None = None,
    metadata: dict | None = None,
) -> None:
    stmt = sa.text("""
        INSERT INTO audit_logs (owner_id, user_id, action, entity_type, entity_id, description, metadata, created_at)
        VALUES (:owner_id, :user_id, :action, :entity_type, :entity_id, :description, :metadata, :created_at)
    """)
    await db.execute(stmt, {
        "owner_id": owner_id,
        "user_id": user_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "description": description,
        "metadata": sanitize_metadata(metadata),
        "created_at": datetime.now(timezone.utc),
    })
