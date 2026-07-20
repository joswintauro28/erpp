from sqlalchemy import Column, Integer, String
from app.database import Base

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    quote_no = Column(String)
    account = Column(String)
    value = Column(String)
    valid_until = Column(String)
    status = Column(String)
    owner = Column(String)
    file_data = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
