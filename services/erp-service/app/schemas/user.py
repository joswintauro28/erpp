from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str | None
    is_active: bool
    last_login: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMe(BaseModel):
    id: int
    email: str
    full_name: str | None
    is_active: bool
    last_login: datetime | None
    created_at: datetime
    organization_id: int | None = None
    organization_name: str | None = None
    role: str | None = None
    permissions: list[str] = []

    model_config = {"from_attributes": True}
