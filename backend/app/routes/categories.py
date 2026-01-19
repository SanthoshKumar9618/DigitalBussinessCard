from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.utils.jwt_handler import get_current_user
from app.services import categories_service
from app.schemas.category_schema import CategoryResult

router = APIRouter(prefix="/categories", tags=["Categories / Filters"])


@router.get("/search", response_model=List[CategoryResult])
async def search_categories(
    name: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    job: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    results = await categories_service.search(db, current_user.id, name, company, job, tag)
    return results
