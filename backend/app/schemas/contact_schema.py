from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, UUID4, field_validator


class ContactCreate(BaseModel):
    target_profile_id: UUID4
    tag: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None   # nfc, qr, manual
    met_at: Optional[str] = Field(None, max_length=255)


class ContactManualCreate(BaseModel):
    """A contact without a SmartCard: scanned paper card, converted lead, typed in."""
    name: str = Field(..., min_length=1, max_length=255)
    job_title: Optional[str] = Field(None, max_length=255)
    company: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=64)
    whatsapp: Optional[str] = Field(None, max_length=64)
    website: Optional[str] = Field(None, max_length=1024)
    linkedin: Optional[str] = Field(None, max_length=512)
    address: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=2000)
    tag: Optional[str] = Field(None, max_length=120)
    met_at: Optional[str] = Field(None, max_length=255)
    met_on: Optional[date] = None
    source: Literal["scan", "lead", "manual"] = "manual"

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v


class ContactUpdate(BaseModel):
    tag: Optional[str] = Field(None, max_length=120)
    notes: Optional[str] = Field(None, max_length=2000)
    met_at: Optional[str] = Field(None, max_length=255)
    met_on: Optional[date] = None
    follow_up_at: Optional[datetime] = None   # null clears the reminder
    follow_up_done: Optional[bool] = None


class ContactProfileOut(BaseModel):
    avatar_url: Optional[str] = None
    display_name: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None

    class Config:
        from_attributes = True


class ContactOut(BaseModel):
    id: UUID4
    target_profile_id: Optional[UUID4] = None
    saved_display_name: Optional[str]
    saved_phone: Optional[str]
    saved_email: Optional[str]
    saved_company: Optional[str]
    saved_job_title: Optional[str]
    saved_website: Optional[str]
    saved_whatsapp: Optional[str]
    saved_linkedin: Optional[str]
    saved_address: Optional[str] = None
    tag: Optional[str]
    notes: Optional[str]
    source: Optional[str]
    met_at: Optional[str] = None
    met_on: Optional[date] = None
    follow_up_at: Optional[datetime] = None
    follow_up_done: Optional[bool] = False
    created_at: Optional[datetime] = None

    target_profile: Optional[ContactProfileOut] = None

    class Config:
        from_attributes = True


class FollowUpDraftIn(BaseModel):
    channel: Literal["email", "whatsapp", "linkedin"] = "email"
    tone: Literal["friendly", "formal", "brief"] = "friendly"
    goal: Optional[str] = Field(None, max_length=300)


class FollowUpDraftOut(BaseModel):
    subject: str
    message: str


class RemindersOut(BaseModel):
    overdue: List[ContactOut]
    today: List[ContactOut]
    upcoming: List[ContactOut]
