from datetime import datetime, timedelta, timezone

import sqlalchemy as sa
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import (
    ConflictException,
    CredentialsException,
    ForbiddenException,
    TooManyRequestsException,
)
from app.core.security import (
    compute_refresh_token_hash,
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.repositories.user import UserRepository


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(
        self,
        email: str,
        password: str,
        full_name: str | None = None,
    ) -> User:
        is_valid, msg = validate_password_strength(password)
        if not is_valid:
            raise ValueError(msg)

        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ConflictException("A user with this email already exists")

        user = await self.user_repo.create(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
        )
        return user

    async def authenticate(
        self,
        email: str,
        password: str,
        request: Request | None = None,
    ) -> tuple[User, str, str]:
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise CredentialsException("Invalid email or password")

        if not user.is_active:
            raise ForbiddenException("This account has been deactivated")

        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            raise TooManyRequestsException(
                "Account temporarily locked due to multiple failed attempts. Try again later."
            )

        if not verify_password(password, user.password_hash):
            attempts = await self.user_repo.increment_failed_attempts(user.id)
            remaining = settings.MAX_LOGIN_ATTEMPTS - attempts
            if remaining <= 0:
                await self.user_repo.lock_account(user.id, settings.ACCOUNT_LOCKOUT_MINUTES)
                raise TooManyRequestsException(
                    "Account locked due to too many failed login attempts. Try again in "
                    f"{settings.ACCOUNT_LOCKOUT_MINUTES} minutes."
                )
            raise CredentialsException("Invalid email or password")

        await self.user_repo.record_login(user.id)

        access_token = create_access_token(
            user_id=user.id,
        )

        raw_refresh, hashed_refresh = generate_refresh_token()
        token = RefreshToken(
            user_id=user.id,
            token_hash=hashed_refresh,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.REFRESH_TOKEN_EXPIRE_SECONDS),
            user_agent=request.headers.get("user-agent") if request else None,
            ip_address=request.client.host if request and request.client else None,
        )
        self.db.add(token)
        await self.db.flush()

        return user, access_token, raw_refresh

    async def refresh_access_token(self, raw_refresh_token: str) -> tuple[User, str]:
        token_hash = compute_refresh_token_hash(raw_refresh_token)

        stmt = sa.select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
        result = await self.db.execute(stmt)
        token_record = result.scalar_one_or_none()

        if not token_record:
            raise CredentialsException("Invalid or expired refresh token")

        user = await self.user_repo.get(token_record.user_id)
        if not user or not user.is_active:
            raise CredentialsException("User account is not active")

        new_access_token = create_access_token(
            user_id=user.id,
        )

        return user, new_access_token

    async def revoke_refresh_token(self, raw_refresh_token: str) -> None:
        token_hash = compute_refresh_token_hash(raw_refresh_token)
        stmt = sa.update(RefreshToken).where(
            RefreshToken.token_hash == token_hash
        ).values(revoked=True)
        await self.db.execute(stmt)
        await self.db.flush()

    async def revoke_all_user_tokens(self, user_id: int) -> None:
        stmt = sa.update(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,
        ).values(revoked=True)
        await self.db.execute(stmt)
        await self.db.flush()
