from pydantic import BaseModel, EmailStr
from typing import Optional

class InviteMember(BaseModel):
    email: EmailStr
    role_id: int

class ChangeRole(BaseModel):
    role_id: int

class AcceptInvitation(BaseModel):
    token: str
    email: EmailStr
    full_name: str
    password: str
