from collections.abc import Generator

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.exceptions import CredentialsException, ForbiddenException
from app.core.permissions import has_permission
from app.core.security import decode_access_token
from app.database import get_db


def get_current_user_id(
    authorization: str = Header(..., description="Bearer <token>"),
) -> int:
    if not authorization.startswith("Bearer "):
        raise CredentialsException("Invalid authorization header format")
    token = authorization[7:]
    payload = decode_access_token(token)
    if payload is None:
        raise CredentialsException("Invalid or expired token")
    user_id = payload.get("user_id")
    if user_id is None:
        raise CredentialsException("Token missing user_id")
    return user_id


def require_permission(permission_code: str):
    def dependency(
        user_id: int = Depends(get_current_user_id),
        db: Session = Depends(get_db),
    ) -> int:
        if not has_permission(db, user_id, permission_code):
            raise ForbiddenException(f"Required permission: {permission_code}")
        return user_id
    return dependency
