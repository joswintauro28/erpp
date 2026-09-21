from sqlalchemy import Column, Integer, String, Text, JSON
from app.database import Base

class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    owner_id = Column(Integer, index=True, nullable=True)
    name = Column(String)
    account = Column(String)
    value = Column(String)
    probability = Column(String)
    close_date = Column(String)
    stage = Column(String)
    owner = Column(String)
    updated_at = Column(String, nullable=True)

    # Pipeline intelligence
    discovery_notes = Column(Text, nullable=True)
    lead_id_str = Column(String, nullable=True, index=True)
    # [{stage, at, by}] progression trail for the Kanban/table view
    stage_history = Column(JSON, nullable=True)
    file_id = Column(Integer, nullable=True)
