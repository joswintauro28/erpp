import psycopg2
from psycopg2.extras import RealDictCursor
import time

while True:
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="vexbill",
            user="postgres",
            password="jesusilu10@",
            cursor_factory=RealDictCursor
        )

        cursor = conn.cursor()

        print("Database connection successful!")
        break

    except Exception as error:
        print("Database connection failed")
        print(error)
        time.sleep(2)