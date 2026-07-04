import json
import logging
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {"password", "secret", "token", "apikey", "api_key", "key_secret", "webhook_secret", "authorization"}


def _sanitize(value):
    if isinstance(value, dict):
        return {k: "[redacted]" if any(s in k.lower() for s in SENSITIVE_KEYS) else _sanitize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize(v) for v in value]
    return value


def log_action(
    db: Session,
    owner_id: int,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int | str | None,
    description: str,
    metadata: dict | None = None,
):
    try:
        clean_metadata = _sanitize(metadata) if metadata else None
        db.execute(
            text("""
                INSERT INTO audit_logs (owner_id, user_id, action, entity_type, entity_id, description, metadata)
                VALUES (:owner_id, :user_id, :action, :entity_type, :entity_id, :description, :metadata::jsonb)
            """),
            {
                "owner_id": owner_id,
                "user_id": user_id,
                "action": action,
                "entity_type": entity_type,
                "entity_id": str(entity_id) if entity_id else None,
                "description": description,
                "metadata": json.dumps(clean_metadata, default=str) if clean_metadata else None,
            },
        )
        db.commit()
    except Exception:
        logger.exception("Failed to write audit log")
        db.rollback()
