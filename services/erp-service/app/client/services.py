import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.client.models import Client
from app.core.database import BaseRepository


class ClientRepository(BaseRepository[Client]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Client)


class ClientService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ClientRepository(db)

    async def list_clients(self, owner_id: int) -> list[Client]:
        stmt = sa.select(Client).where(Client.owner_id == owner_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_client(self, client_id: int, owner_id: int) -> Client | None:
        stmt = sa.select(Client).where(
            Client.id == client_id,
            Client.owner_id == owner_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_client(self, owner_id: int, **data) -> Client:
        return await self.repo.create(owner_id=owner_id, **data)

    async def update_client(self, client_id: int, owner_id: int, **data) -> Client | None:
        client = await self.get_client(client_id, owner_id)
        if not client:
            return None
        return await self.repo.update(client_id, **data)

    async def delete_client(self, client_id: int, owner_id: int) -> bool:
        client = await self.get_client(client_id, owner_id)
        if not client:
            return False
        return await self.repo.delete(client_id)

    async def count_clients(self, owner_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(Client).where(Client.owner_id == owner_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
