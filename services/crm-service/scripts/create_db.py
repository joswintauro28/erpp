import asyncio
import sys
import os
from urllib.parse import urlparse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def ensure_db_exists():
    db_url = settings.DATABASE_URL.replace("+asyncpg", "")
    parsed = urlparse(db_url)
    target_db = parsed.path.lstrip("/")

    # Build admin connection to default 'postgres' database
    admin_parsed = parsed._replace(path="/postgres")
    host = admin_parsed.hostname or "localhost"
    port = admin_parsed.port or 5432
    user = admin_parsed.username or "postgres"
    password = admin_parsed.password or ""

    import asyncpg

    conn = await asyncpg.connect(
        host=host, port=port, user=user, password=password, database="postgres"
    )

    exists = await conn.fetchval(
        "SELECT 1 FROM pg_database WHERE datname = $1", target_db
    )

    if not exists:
        print(f"Database '{target_db}' does not exist. Creating...")
        await conn.execute(f'CREATE DATABASE "{target_db}"')
        print(f"Database '{target_db}' created successfully!")
    else:
        print(f"Database '{target_db}' already exists.")

    await conn.close()


if __name__ == "__main__":
    asyncio.run(ensure_db_exists())
