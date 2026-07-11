from sqlalchemy import Column, Integer, String

from app.core.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    subject = Column(String)
    customer = Column(String)
    date_raised = Column(String)
    status = Column(String)
    owner_id = Column(Integer, nullable=False, index=True)


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    score = Column(Integer)
    comment = Column(String)
    customer = Column(String)
    date = Column(String)
    owner_id = Column(Integer, nullable=False, index=True)
