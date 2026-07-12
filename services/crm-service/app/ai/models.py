from sqlalchemy import Column, Integer, String

from app.core.database import Base


class AIAssistantLog(Base):
    __tablename__ = "ai_logs"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    query = Column(String)
    category = Column(String)
    date = Column(String)
    status = Column(String)
    organization_id = Column(Integer, nullable=False, index=True)
