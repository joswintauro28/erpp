import asyncio
import sys
import os
from urllib.parse import urlparse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

# Add parent directory to path to load dotenv
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

async def ensure_db_exists():
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:root@localhost:5432/erp_crm")
    parsed = urlparse(db_url)
    
    # Extract target database name
    target_db = parsed.path.lstrip("/")
    
    # Rebuild administrative connection URL pointing to 'postgres' default database
    admin_parsed = parsed._replace(path="/postgres")
    admin_url = admin_parsed.geturl()
    
    print(f"Connecting to database server to verify '{target_db}' existence...")
    engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")
    
    async with engine.connect() as conn:
        query = text(f"SELECT 1 FROM pg_database WHERE datname = '{target_db}'")
        result = await conn.execute(query)
        exists = result.scalar()
        
        if not exists:
            print(f"Database '{target_db}' does not exist. Creating...")
            await conn.execute(text(f"CREATE DATABASE {target_db}"))
            print(f"Database '{target_db}' created successfully!")
        else:
            print(f"Database '{target_db}' already exists.")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(ensure_db_exists())
