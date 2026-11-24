"""Multiple cards per user: which card a request is about.

The app sends `X-Card-Id: <card uuid>` to work on a specific card. Without the
header the user's primary card is used, so older app versions keep working.
"""
from uuid import UUID

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Profile
from app.utils.jwt_handler import get_current_user

MAX_CARDS = 5


def get_active_card(
    x_card_id: str | None = Header(default=None, alias="X-Card-Id"),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Profile | None:
    if x_card_id:
        try:
            card_id = UUID(x_card_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid card id")
        card = db.query(Profile).filter(Profile.id == card_id, Profile.user_id == user.id).first()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        return card
    return user.profile  # primary card (or None)


def require_active_card(card: Profile | None = Depends(get_active_card)) -> Profile:
    if not card:
        raise HTTPException(status_code=404, detail="Create your profile first")
    return card


def card_email(card: Profile) -> str | None:
    return card.contact_email or (card.user.email if card.user else None)


def card_phone(card: Profile) -> str | None:
    return card.contact_phone or (card.user.phone if card.user else None)
