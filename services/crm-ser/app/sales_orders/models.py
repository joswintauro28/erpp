from sqlalchemy import Column, Integer, String
from app.database import Base

class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    so_no = Column(String)
    account = Column(String)
    from_quote = Column(String)
    value = Column(String)
    eta = Column(String)
    date_ordered = Column(String, nullable=True)
    status = Column(String)
    owner = Column(String)
    file_data = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
