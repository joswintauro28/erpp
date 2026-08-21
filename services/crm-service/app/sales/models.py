from sqlalchemy import Column, Integer, String
from app.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    invoice_no = Column(String)
    account = Column(String)
    amount = Column(String)
    issued_date = Column(String, nullable=True)
    due_date = Column(String, nullable=True)
    status = Column(String)
    rep = Column(String, nullable=True)
    file_uri = Column(String, nullable=True)
