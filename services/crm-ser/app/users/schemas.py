from pydantic import BaseModel
from typing import List
from app.core.schemas import GenericSummary

class UserBase(BaseModel):
    id_str: str
    name: str
    email: str
    role: str
    status: str
    last_login: str
    owner: str

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

class UserManagementData(BaseModel):
    summary: GenericSummary
    users: List[User]

class UserLogin(BaseModel):
    email: str
    password: str
