import asyncio
import sys
sys.path.append('.')

from app.database import async_session_factory
from app.models.invoice import Quotation
import sqlalchemy as sa

async def main():
    async with async_session_factory() as session:
        try:
            res = await session.execute(sa.select(Quotation))
            notes = res.scalars().all()
            print(f"Quotation table exists! Found {len(notes)} quotations.")
        except Exception as e:
            print(f"Error querying quotations: {e}")

if __name__ == "__main__":
    asyncio.run(main())
