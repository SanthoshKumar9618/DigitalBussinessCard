# app/routes/profile_card.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.profile_card_schema import ProfileCardSettingsOut, ProfileCardSettingsUpdate
from app.services.cards import require_active_card
from app.database.models import Profile
from app.services.profile_card_service import get_or_create_card_settings, update_card_settings

router = APIRouter(prefix="/profile-card", tags=["Profile Card"])

@router.get("/card", response_model=ProfileCardSettingsOut)
def get_card_settings(
    db: Session = Depends(get_db),
    card: Profile = Depends(require_active_card),
):
    return get_or_create_card_settings(db, card.id)


@router.put("/card", response_model=ProfileCardSettingsOut)
def update_card(
    payload: ProfileCardSettingsUpdate,
    db: Session = Depends(get_db),
    card: Profile = Depends(require_active_card),
):
    return update_card_settings(db, card.id, payload)
