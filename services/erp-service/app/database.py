import time
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from contextlib import contextmanager

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings


# ── DSN Cleaning ─────────────────────────────────────────────────────────────
# Strip Prisma-specific "schema" parameter to prevent psycopg2 crash
parsed_url = urlparse(settings.DATABASE_URL)
query_params = [(k, v) for k, v in parse_qsl(parsed_url.query) if k != "schema"]
cleaned_query = urlencode(query_params)
cleaned_dsn = urlunparse(parsed_url._replace(query=cleaned_query))


# ── 1. Persistent Legacy Connection (backward compat for routers) ────────────
# Single persistent connection used by routers that import `conn` / `cursor`
# directly.  NOT taken from the pool (avoids connection leak).
_legacy_conn = psycopg2.connect(cleaned_dsn, cursor_factory=RealDictCursor)
_legacy_conn.autocommit = False


def _legacy_cursor():
    """Return a new cursor on the legacy connection."""
    return _legacy_conn.cursor()


conn = _legacy_conn          # module-level alias – used by 35 routers
cursor = _legacy_cursor()    # convenience cursor


# ── 2. Connection Pool (for get_db() context-manager) ───────────────────────
pool: ThreadedConnectionPool | None = None
for retry in range(5):
    try:
        pool = ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=cleaned_dsn,
            cursor_factory=RealDictCursor,
        )
        print("Database connection pool initialized successfully!")
        break
    except Exception as error:
        print(f"Database connection pool init failed (retry {retry + 1}/5): {error}")
        time.sleep(2)

if pool is None:
    raise RuntimeError("Failed to connect to the database after several retries.")


@contextmanager
def get_db():
    """Yield a psycopg2 connection from the pool (returns it afterwards).

    Usage::

        with get_db() as connection:
            with connection.cursor() as cur:
                cur.execute(...)

    This is the recommended way for raw-SQL code.
    """
    connection = pool.getconn()
    try:
        yield connection
    finally:
        pool.putconn(connection)


# ── 3. SQLAlchemy ORM Setup ─────────────────────────────────────────────────
engine = create_engine(cleaned_dsn, pool_size=2, max_overflow=5, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db_session():
    """FastAPI dependency that yields a SQLAlchemy session.

    Usage::

        @router.get("/")
        def my_endpoint(db: Session = Depends(get_db_session)):
            ...
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
