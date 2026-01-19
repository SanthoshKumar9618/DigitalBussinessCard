from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from uuid import UUID


class ProfileBase(BaseModel):
    display_name: str = Field(..., max_length=255)
    job_title: Optional[str] = Field(None, max_length=255)
    company: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = Field(None, max_length=600)
    website: Optional[HttpUrl] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    whatsapp: Optional[str] = None


class ProfileCreate(BaseModel):
    display_name: str = Field(..., max_length=255)
    job_title: Optional[str] = None
    company: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[HttpUrl] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    whatsapp: Optional[str] = None



class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[HttpUrl] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    whatsapp: Optional[str] = None
    
    
class ProfileOut(ProfileBase):
    id: UUID
    slug: str
    avatar_url: Optional[str]

    email: str
    phone: Optional[str]

    class Config:
        from_attributes = True


class PublicProfileOut(BaseModel):
    id: UUID          # ⭐ THIS IS THE KEY FIX
    display_name: str
    slug: str
    job_title: Optional[str]
    company: Optional[str]
    bio: Optional[str]
    website: Optional[str]
    linkedin: Optional[str]
    twitter: Optional[str]
    facebook: Optional[str]
    whatsapp: Optional[str]
    avatar_url: Optional[str]

    class Config:
        from_attributes = True  # <-- Pydantic V2 replacement for orm_mode

