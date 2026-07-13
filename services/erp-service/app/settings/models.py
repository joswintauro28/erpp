import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(sa.Integer, nullable=False, unique=True, index=True)
    settings: Mapped[dict] = mapped_column(sa.JSON, nullable=False, default=dict)
