import asyncio
import asyncpg

ADMIN_DB_URL = "postgresql://postgres:root@localhost:5432/postgres"
DATABASES = ["erp_iam", "erp_billing", "erp_inventory", "erp_db", "erp_crm"]


async def recreate_databases():
    print("Connecting to database server using asyncpg...")
    try:
        conn = await asyncpg.connect(ADMIN_DB_URL)
    except Exception as e:
        print(f"Failed to connect to PostgreSQL server: {e}")
        return

    for db in DATABASES:
        print(f"\n--- Processing database: {db} ---")
        
        # Terminate active connections to the database to allow dropping it
        try:
            await conn.execute(f"""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '{db}'
                  AND pid <> pg_backend_pid();
            """)
        except Exception as e:
            print(f"Could not terminate active connections to '{db}': {e}")

        # Drop database if exists
        try:
            print(f"Dropping database '{db}' if exists...")
            # DATABASE commands cannot run in transactions, so we use execute() directly
            await conn.execute(f"DROP DATABASE IF EXISTS {db}")
            print(f"Database '{db}' dropped.")
        except Exception as e:
            print(f"Error dropping database '{db}': {e}")
            
        # Create empty database
        try:
            print(f"Creating empty database '{db}'...")
            await conn.execute(f"CREATE DATABASE {db}")
            print(f"Database '{db}' created successfully.")
        except Exception as e:
            print(f"Error creating database '{db}': {e}")

    await conn.close()
    print("\nAll database instances have been re-instantiated empty!")


if __name__ == "__main__":
    asyncio.run(recreate_databases())
