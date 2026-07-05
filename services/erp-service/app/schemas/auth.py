from datetime import datetime

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: int


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class RegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: int


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class LogoutResponse(BaseModel):
    message: str = "Logged out successfully"


class TokenPayload(BaseModel):
    user_id: int
    organization_id: int | None = None
    role: str | None = None
    type: str = "access"
    exp: int
