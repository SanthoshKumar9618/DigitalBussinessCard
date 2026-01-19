from pydantic import BaseModel
from typing import Literal

class SocialLoginSchema(BaseModel):
    provider: Literal["google", "apple"]
    token: str
