import re
import secrets
import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


PASSWORD_REGEX = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]).{8,128}$"
)


def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8 or len(password) > 128:
        return False, "Password must be between 8 and 128 characters"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]", password):
        return False, "Password must contain at least one special character"
    return True, ""


def create_access_token(
    user_id: int,
    organization_id: int | None = None,
    role: str | None = None,
    expires_delta: int | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "organization_id": organization_id,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(seconds=expires_delta or settings.ACCESS_TOKEN_EXPIRE_SECONDS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise JWTError("Invalid token type")
        return payload
    except JWTError:
        raise


def generate_refresh_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(64)
    hashed = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, hashed


def compute_refresh_token_hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
