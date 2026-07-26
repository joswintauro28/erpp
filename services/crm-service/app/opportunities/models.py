from sqlalchemy import Column, Integer, String
from app.database import Base

class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    account = Column(String)
    value = Column(String)
    probability = Column(String)
    close_date = Column(String)
    stage = Column(String)
    owner = Column(String)
    updated_at = Column(String, nullable=True)
