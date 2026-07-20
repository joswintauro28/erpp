import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base
from app import models

async def reset_db():
    print("Resetting database...")
    async with engine.begin() as conn:
        # Drop all tables registered in Base
        await conn.run_sync(Base.metadata.drop_all)
        # Drop alembic_version table
        await conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        # Drop legacy tables no longer in metadata
        await conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS quotations CASCADE"))
    # Recreate all tables from current metadata
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database reset completed successfully!")

if __name__ == "__main__":
    asyncio.run(reset_db())
