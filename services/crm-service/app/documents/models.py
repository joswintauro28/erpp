from sqlalchemy import Column, Integer, String
from app.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    name = Column(String)
    type = Column(String)
    account = Column(String)
    size = Column(String)
    status = Column(String)
    owner = Column(String)
    updated_at = Column(String)
    file_uri = Column(String, nullable=True)
    summary = Column(String, nullable=True)
