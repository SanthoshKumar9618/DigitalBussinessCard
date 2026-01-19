from pydantic import BaseModel, UUID4
from typing import Optional

class ContactCreate(BaseModel):
    target_profile_id: UUID4
    tag: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None   # nfc, qr, manual
    
class ContactProfileOut(BaseModel):
    avatar_url: Optional[str]
    
    class Config:
        from_attributes = True

class ContactOut(BaseModel):
    id: UUID4
    target_profile_id: UUID4
    saved_display_name: Optional[str]
    saved_phone: Optional[str]
    saved_email: Optional[str]
    saved_company: Optional[str]
    saved_job_title: Optional[str]
    saved_website: Optional[str]
    saved_whatsapp: Optional[str]
    saved_linkedin: Optional[str]
    tag: Optional[str]
    notes: Optional[str]
    source: Optional[str]
    
    target_profile: Optional[ContactProfileOut]

    class Config:
        from_attributes = True  
