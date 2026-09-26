from sqlalchemy import Column, Integer, String
from app.database import Base

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    organization_id = Column(Integer, nullable=False, default=1, index=True)
    owner_id = Column(Integer, index=True, nullable=True)
    title = Column(String)
    category = Column(String)
    last_run = Column(String)
    status = Column(String)
    owner = Column(String)
