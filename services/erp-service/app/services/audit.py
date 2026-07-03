import json
import logging
from typing import Any

from psycopg2.extras import Json

from app.database import conn


logger = logging.getLogger(__name__)

SENSITIVE_KEY_PARTS = (
    "password",
    "secret",
    "token",
    "apikey",
    "api_key",
    "key_secret",
    "webhook_secret",
    "authorization",
)


def _is_sensitive_key(key: str) -> bool:
    normalized = key.lower().replace("-", "_")
    return any(part in normalized for part in SENSITIVE_KEY_PARTS)


def sanitize_metadata(value: Any) -> Any:
    if isinstance(value, dict):
        sanitized = {}
        for key, item in value.items():
            if _is_sensitive_key(str(key)):
                sanitized[key] = "[redacted]"
            else:
                sanitized[key] = sanitize_metadata(item)
        return sanitized
    if isinstance(value, list):
        return [sanitize_metadata(item) for item in value]
    return value


def log_action(
    owner_id,
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata=None,
):
    try:
        clean_metadata = sanitize_metadata(metadata) if metadata is not None else None
        metadata_json = Json(clean_metadata, dumps=lambda obj: json.dumps(obj, default=str)) if clean_metadata is not None else None
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO audit_logs
                    (owner_id, user_id, action, entity_type, entity_id, description, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    owner_id,
                    user_id,
                    action,
                    entity_type,
                    str(entity_id) if entity_id is not None else None,
                    description,
                    metadata_json,
                ),
            )
        conn.commit()
    except Exception:
        logger.exception("Failed to write audit log")
        try:
            conn.rollback()
        except Exception:
            pass
