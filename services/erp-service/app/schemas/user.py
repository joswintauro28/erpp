from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8 or len(v) > 72:
            raise ValueError("Password must be between 8 and 72 characters")
        return v


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    last_login: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMe(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    last_login: datetime | None = None
    organization_id: int | None = None
    organization_name: str | None = None
    role: str | None = None
    permissions: list[str] = []

    model_config = {"from_attributes": True}
