"""Multiple cards per user (e.g. Work and Personal)."""
import os
import shutil
import uuid
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, TypeAdapter, field_validator
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.connection import get_db
from app.database.models import Contact, NFCLink, Profile, ProfileCardSettings, ProfileLink, SlugAlias
from app.services.cards import MAX_CARDS, card_email, card_phone
from app.services.profile_service import unique_slug
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/cards", tags=["Cards"])

AVATAR_DIR = "uploads/avatars"
_EMAIL = TypeAdapter(EmailStr)
COPY_FIELDS = ("display_name", "job_title", "company", "bio", "website", "linkedin", "twitter", "facebook", "whatsapp")


class CardCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=50)
    copy_from: Optional[UUID] = None  # start from one of your cards (default: primary)
    blank: bool = False  # start empty instead of copying

    @field_validator("label")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Give the card a name")
        return v


class CardUpdate(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=50)
    # Empty string clears the override (falls back to the account email/phone)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)

    @field_validator("contact_email")
    @classmethod
    def _email(cls, v):
        if v is None or not v.strip():
            return v
        return str(_EMAIL.validate_python(v.strip()))


def card_summary(card: Profile) -> dict:
    return {
        "id": str(card.id),
        "label": card.label,
        "is_primary": bool(card.is_primary),
        "slug": card.slug,
        "display_name": card.display_name,
        "job_title": card.job_title,
        "company": card.company,
        "avatar_url": card.avatar_url,
        "email": card_email(card),
        "phone": card_phone(card),
        "contact_email": card.contact_email,
        "contact_phone": card.contact_phone,
        "profile_url": settings.public_profile_url(card.slug),
    }


def _own_card(db: Session, user, card_id: UUID) -> Profile:
    card = db.query(Profile).filter(Profile.id == card_id, Profile.user_id == user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


def _copy_avatar(path: str | None) -> str | None:
    """Give the new card its own copy of the photo, so deleting one never breaks the other."""
    if not path or path.startswith("http"):
        return path
    src = os.path.join(AVATAR_DIR, os.path.basename(path))
    if not os.path.exists(src):
        return None
    ext = os.path.splitext(src)[1]
    name = f"{uuid.uuid4()}{ext}"
    shutil.copyfile(src, os.path.join(AVATAR_DIR, name))
    return f"/uploads/avatars/{name}"


@router.get("", response_model=List[dict])
def list_cards(user=Depends(get_current_user)):
    return [card_summary(c) for c in user.profiles]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_card(payload: CardCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cards = user.profiles
    if not cards:
        raise HTTPException(status_code=400, detail="Create your profile first")
    if len(cards) >= MAX_CARDS:
        raise HTTPException(status_code=400, detail=f"You can have up to {MAX_CARDS} cards.")
    if any(c.label.lower() == payload.label.lower() for c in cards):
        raise HTTPException(status_code=400, detail="You already have a card with that name.")

    source = _own_card(db, user, payload.copy_from) if payload.copy_from else user.profile
    new = Profile(
        user_id=user.id,
        label=payload.label,
        is_primary=False,
        slug=unique_slug(db, f"{source.display_name or user.name} {payload.label}"),
        display_name=source.display_name or user.name,
    )
    if not payload.blank:
        for f in COPY_FIELDS:
            setattr(new, f, getattr(source, f))
        new.avatar_url = _copy_avatar(source.avatar_url)
    db.add(new)
    db.commit()
    db.refresh(new)
    return card_summary(new)


@router.patch("/{card_id}")
def update_card(card_id: UUID, payload: CardUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    card = _own_card(db, user, card_id)
    data = payload.model_dump(exclude_unset=True)
    if "label" in data and data["label"] is not None:
        label = data["label"].strip()
        if any(c.id != card.id and c.label.lower() == label.lower() for c in user.profiles):
            raise HTTPException(status_code=400, detail="You already have a card with that name.")
        card.label = label
    if "contact_email" in data:
        card.contact_email = (data["contact_email"] or "").strip().lower() or None
    if "contact_phone" in data:
        card.contact_phone = (data["contact_phone"] or "").strip() or None
    db.commit()
    db.refresh(card)
    return card_summary(card)


@router.post("/{card_id}/primary")
def make_primary(card_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    card = _own_card(db, user, card_id)
    if not card.is_primary:
        for c in user.profiles:
            if c.is_primary:
                c.is_primary = False
        db.flush()  # clear the old primary first (one-primary-per-user index)
        card.is_primary = True
        db.commit()
    db.expire(user, ["profiles"])
    return [card_summary(c) for c in user.profiles]


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(card_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    card = _own_card(db, user, card_id)
    if card.is_primary:
        raise HTTPException(status_code=400, detail="Make another card primary before deleting this one.")
    primary = user.profile

    # 1. Links to the deleted card keep working: they now open the primary card.
    db.query(SlugAlias).filter(SlugAlias.profile_id == card.id).update({SlugAlias.profile_id: primary.id})
    db.add(SlugAlias(slug=card.slug, profile_id=primary.id))

    # 2. NFC tags move to the primary card.
    for tag in db.query(NFCLink).filter(NFCLink.profile_id == card.id).all():
        tag.profile_id = primary.id
        tag.encoded_url = f"{settings.public_profile_url(primary.slug)}?src=nfc"

    # 3. People who saved this card keep you as a contact (pointed at the primary card).
    already = {
        c.owner_id
        for c in db.query(Contact.owner_id).filter(Contact.target_profile_id == primary.id).all()
    }
    for contact in db.query(Contact).filter(Contact.target_profile_id == card.id).all():
        if contact.owner_id in already:
            db.delete(contact)
        else:
            contact.target_profile_id = primary.id

    # 4. Card-only data goes with the card (links, design; leads and stats cascade).
    db.query(ProfileLink).filter(ProfileLink.profile_id == card.id).delete()
    db.query(ProfileCardSettings).filter(ProfileCardSettings.profile_id == card.id).delete()
    avatar = card.avatar_url
    db.flush()
    db.delete(card)
    db.commit()

    if avatar and not avatar.startswith("http"):
        path = os.path.join(AVATAR_DIR, os.path.basename(avatar))
        if os.path.exists(path):
            os.remove(path)
