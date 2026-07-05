from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Lead
from app.repositories.base import BaseRepository


class LeadRepository(BaseRepository[Lead]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Lead)
