from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal, engine
from app.models.base import Base
from app.models.organization import Permission
from app.core.permissions import ensure_permissions, ensure_role_permissions, ensure_roles


def init_db():
    Base.metadata.create_all(bind=engine)
    # Ensure payments table has the status column if it was created historically without it
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed'"))
    
    db: Session = SessionLocal()
    try:
        existing = db.execute(select(Permission).limit(1)).scalar_one_or_none()
        if existing is None:
            permissions_map = ensure_permissions(db)
            roles = ensure_roles(db, permissions_map)
            ensure_role_permissions(db, roles, permissions_map)
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="VexBill ERP Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from app.api.v1 import auth, clients, dashboard, invoices, products, notifications

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(products.router)
app.include_router(invoices.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)


@app.get("/")
def health_check():
    return {"message": "VexBill API Running", "status": "healthy"}
