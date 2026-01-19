# backend/app/schemas/user_schema.py
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from uuid import UUID


class UserCreate(BaseModel):
    name: str
    phone: str
    email: EmailStr
    password: str
    confirm_password: str

    @validator("name", "phone", "email", "password", "confirm_password")
    def not_empty(cls, v):
        if not v or (isinstance(v, str) and not v.strip()):
            raise ValueError("Field is required")
        return v

    @validator("confirm_password")
    def passwords_match(cls, v, values, **kwargs):
        pw = values.get("password")
        if pw and v != pw:
            raise ValueError("Passwords do not match")
        return v


class UserOut(BaseModel):
    id: UUID 
    name: str
    phone: Optional[str]
    email: EmailStr

    model_config = {
        "from_attributes": True  
    }


class UserLogin(BaseModel):
    identifier: str  # phone OR email
    password: str


class ForgotPassword(BaseModel):
    identifier: str


class VerifyOTP(BaseModel):
    identifier: str
    otp: str


class ResetPassword(BaseModel):
    identifier: str
    otp: str
    password: str
    confirm_password: str

    @validator("confirm_password")
    def passwords_match(cls, v, values, **kwargs):
        pw = values.get("password")
        if pw and v != pw:
            raise ValueError("Passwords do not match")
        return v


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class VerifyEmail(BaseModel):
    user_id: str
    otp: str

class ResetPassword(BaseModel):
    identifier: str   # ✅ REQUIRED but hidden from UI
    otp: str
    password: str
    confirm_password: str
    @validator("confirm_password")
    def passwords_match(cls, v, values, **kwargs):  
        pw = values.get("password")
        if pw and v != pw:
            raise ValueError("Passwords do not match")
        return v
    