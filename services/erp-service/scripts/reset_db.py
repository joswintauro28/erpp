import sys
sys.path.append('.')

import asyncio
from app.database import engine
from app.models import Base

async def reset_db():
    print("Dropping all tables from database...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("All tables dropped successfully!")

if __name__ == "__main__":
    asyncio.run(reset_db())
