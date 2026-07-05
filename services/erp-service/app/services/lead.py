from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client, Lead
from app.repositories.lead import LeadRepository


class LeadService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = LeadRepository(db)

    async def list_leads(self, owner_id: int) -> list[Lead]:
        stmt = sa.select(Lead).where(Lead.owner_id == owner_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_lead(self, lead_id: int, owner_id: int) -> Lead | None:
        stmt = sa.select(Lead).where(
            Lead.id == lead_id,
            Lead.owner_id == owner_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_lead(self, owner_id: int, **data) -> Lead:
        return await self.repo.create(owner_id=owner_id, **data)

    async def update_lead(self, lead_id: int, owner_id: int, **data) -> Lead | None:
        lead = await self.get_lead(lead_id, owner_id)
        if not lead:
            return None
        return await self.repo.update(lead_id, **data)

    async def delete_lead(self, lead_id: int, owner_id: int) -> bool:
        lead = await self.get_lead(lead_id, owner_id)
        if not lead:
            return False
        return await self.repo.delete(lead_id)

    async def convert_lead(self, lead_id: int, owner_id: int) -> Lead | None:
        lead = await self.get_lead(lead_id, owner_id)
        if not lead:
            return None
        if lead.converted_client_id:
            return lead

        client = Client(
            owner_id=owner_id,
            name=lead.company_name,
            email=lead.email,
            phone=lead.phone,
            gst_number=lead.gst_number,
            state=lead.state,
            address=lead.address,
            notes=lead.notes,
        )
        self.db.add(client)
        await self.db.flush()

        lead.status = "Won"
        lead.converted_client_id = client.id
        lead.converted_at = datetime.now(timezone.utc)
        await self.db.flush()

        return lead

    async def count_leads(self, owner_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(Lead).where(Lead.owner_id == owner_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
