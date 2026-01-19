# app/schemas/profile_card_schema.py

from pydantic import BaseModel
from typing import Optional, Dict

class ProfileCardSettingsOut(BaseModel):
    template: Optional[str]
    background_color: Optional[str]
    text_color: Optional[str]
    background_image: Optional[str]
    logo: Optional[str]
    fields: Optional[Dict[str, bool]]

    class Config:
        from_attributes = True


class ProfileCardSettingsUpdate(BaseModel):
    template: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    background_image: Optional[str] = None
    logo: Optional[str] = None
    fields: Optional[Dict[str, bool]] = None
