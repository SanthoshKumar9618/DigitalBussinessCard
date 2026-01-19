# app/routes/profile_card.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.profile_card_schema import ProfileCardSettingsOut, ProfileCardSettingsUpdate
from app.utils.jwt_handler import get_current_user
from app.services.profile_card_service import get_or_create_card_settings, update_card_settings
from app.services.profile_service import get_profile_by_user

router = APIRouter(prefix="/profile-card", tags=["Profile Card"])

@router.get("/card", response_model=ProfileCardSettingsOut)
def get_card_settings(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return get_or_create_card_settings(db, user.profile.id)


@router.put("/card", response_model=ProfileCardSettingsOut)
def update_card(
    payload: ProfileCardSettingsUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return update_card_settings(db, user.profile.id, payload)
