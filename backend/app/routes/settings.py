from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.settings_schema import SettingsOut, SettingsUpdate
from app.services.settings_service import get_or_create_settings, update_settings
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/", response_model=SettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return get_or_create_settings(db, current_user.id)


@router.put("/", response_model=SettingsOut)
def save_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return update_settings(db, current_user.id, payload)
