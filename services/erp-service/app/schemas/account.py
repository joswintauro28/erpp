from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AccountBase(BaseModel):
    account_code: str = Field(..., max_length=50)
    account_name: str = Field(..., max_length=255)
    account_type: str = Field(..., max_length=50)
    account_category: Optional[str] = Field(None, max_length=100)
    parent_account_id: Optional[int] = None
    description: Optional[str] = None
    opening_balance: Optional[float] = 0.0
    currency: Optional[str] = 'INR'
    is_active: Optional[bool] = True

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    account_code: Optional[str] = Field(None, max_length=50)
    account_name: Optional[str] = Field(None, max_length=255)
    account_type: Optional[str] = Field(None, max_length=50)
    account_category: Optional[str] = Field(None, max_length=100)
    parent_account_id: Optional[int] = None
    description: Optional[str] = None
    opening_balance: Optional[float] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None

class AccountResponse(AccountBase):
    id: int
    owner_id: int
    is_system: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
