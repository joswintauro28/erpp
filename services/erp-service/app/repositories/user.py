from datetime import datetime, timedelta, timezone

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, User)

    async def get_by_email(self, email: str) -> User | None:
        stmt = sa.select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def record_login(self, user_id: int) -> None:
        stmt = (
            sa.update(User)
            .where(User.id == user_id)
            .values(
                last_login=datetime.now(timezone.utc),
                failed_login_attempts=0,
                locked_until=None,
            )
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def increment_failed_attempts(self, user_id: int) -> int:
        user = await self.get(user_id)
        if not user:
            return 0
        attempts = (user.failed_login_attempts or 0) + 1
        stmt = (
            sa.update(User)
            .where(User.id == user_id)
            .values(failed_login_attempts=attempts)
        )
        await self.db.execute(stmt)
        await self.db.flush()
        return attempts

    async def lock_account(self, user_id: int, minutes: int) -> None:
        stmt = (
            sa.update(User)
            .where(User.id == user_id)
            .values(locked_until=datetime.now(timezone.utc) + timedelta(minutes=minutes))
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def is_locked(self, user_id: int) -> bool:
        user = await self.get(user_id)
        if not user or not user.locked_until:
            return False
        return user.locked_until > datetime.now(timezone.utc)
