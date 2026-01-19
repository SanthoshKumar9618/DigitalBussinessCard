from pydantic import BaseModel
from typing import Optional

class CategoryResult(BaseModel):
    id: str
    display_name: Optional[str]
    company: Optional[str]
    job_title: Optional[str]
    tag: Optional[str]

    class Config:
        from_attributes = True  
