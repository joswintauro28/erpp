import time
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from contextlib import contextmanager
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Clean database DSN (strip Prisma-specific "schema" parameter to prevent psycopg2 crash)
parsed_url = urlparse(settings.DATABASE_URL)
query_params = [(k, v) for k, v in parse_qsl(parsed_url.query) if k != "schema"]
cleaned_query = urlencode(query_params)
cleaned_dsn = urlunparse(parsed_url._replace(query=cleaned_query))

# 1. Initialize Threaded Connection Pool (Legacy compatibility)
db_pool = None
for retry in range(5):
    try:
        db_pool = ThreadedConnectionPool(
            minconn=5,
            maxconn=30,
            dsn=cleaned_dsn,
            cursor_factory=RealDictCursor
        )
        print("Database connection pool initialized successfully!")
        break
    except Exception as error:
        print(f"Database connection pool initialization failed (retry {retry+1}/5)")
        print(error)
        time.sleep(2)

if db_pool is None:
    raise RuntimeError("Failed to connect to the database after several retries.")

# Legacy global compatibility connection object
conn = db_pool.getconn()
cursor = conn.cursor()

# 2. SQLAlchemy ORM Setup
engine = create_engine(cleaned_dsn, pool_size=5, max_overflow=10, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_db():
    connection = db_pool.getconn()
    try:
        yield connection
    finally:
        db_pool.putconn(connection)