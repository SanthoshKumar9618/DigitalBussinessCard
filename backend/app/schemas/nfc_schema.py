from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class NFCAssign(BaseModel):
    uid: str
    profile_id: UUID

class NFCResolveOut(BaseModel):
    profile_id: str
    display_name: str
    company: Optional[str]
    job_title: Optional[str]
    avatar_url: Optional[str]
    website: Optional[str]
    slug: str
    public_url: str
    share_whatsapp: Optional[str]

class QRGenerate(BaseModel):
    profile_id: UUID
