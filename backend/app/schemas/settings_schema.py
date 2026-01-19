from pydantic import BaseModel
from typing import Optional

class SettingsOut(BaseModel):
    public_profile: bool
    show_phone: bool
    show_email: bool

    card_template: str
    default_share_type: str
    watermark_enabled: bool

    nfc_enabled: bool
    theme: str
    language: str

    class Config:
        from_attributes = True




class SettingsUpdate(BaseModel):
    public_profile: Optional[bool] = None
    show_phone: Optional[bool] = None
    show_email: Optional[bool] = None

    card_template: Optional[str] = None
    default_share_type: Optional[str] = None
    watermark_enabled: Optional[bool] = None

    nfc_enabled: Optional[bool] = None
    theme: Optional[str] = None
    language: Optional[str] = None
