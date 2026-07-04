import psycopg2
from psycopg2.extras import RealDictCursor
import time
import os

while True:
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL environment variable is not set")
            
        conn = psycopg2.connect(
            database_url,
            cursor_factory=RealDictCursor
        )

        cursor = conn.cursor()

        print("Database connection successful!")
        break

    except Exception as error:
        print("Database connection failed")
        print(error)
        time.sleep(2)