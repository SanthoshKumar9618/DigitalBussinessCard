from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Profile
from app.schemas.profile_schema import ProfileCreate, ProfileOut, ProfileUpdate
from app.services import profile_service
from app.services.cards import card_email, card_phone, get_active_card, require_active_card
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/profile", tags=["Profile"])


def card_out(card: Profile) -> dict:
    return {
        "id": str(card.id),
        "slug": card.slug,
        "label": card.label,
        "is_primary": bool(card.is_primary),
        "avatar_url": card.avatar_url,
        "display_name": card.display_name,
        "job_title": card.job_title,
        "company": card.company,
        "bio": card.bio,
        "website": card.website,
        "linkedin": card.linkedin,
        "twitter": card.twitter,
        "facebook": card.facebook,
        "whatsapp": card.whatsapp,
        "email": card_email(card),
        "phone": card_phone(card),
        "contact_email": card.contact_email,
        "contact_phone": card.contact_phone,
    }


@router.post("/", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
async def create_profile(
    payload: ProfileCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create the user's first (primary) card. More cards: POST /cards."""
    profile = await profile_service.create_profile(db=db, user=current_user, payload=payload)
    return card_out(profile)


@router.get("/me")
def get_my_profile(
    current_user=Depends(get_current_user),
    card: Profile | None = Depends(get_active_card),
):
    if not card:
        return {
            "id": None, "slug": None, "label": None, "is_primary": None, "avatar_url": None,
            "display_name": current_user.name, "job_title": None, "company": None, "bio": None,
            "website": None, "linkedin": None, "twitter": None, "facebook": None, "whatsapp": None,
            "email": current_user.email, "phone": current_user.phone,
            "contact_email": None, "contact_phone": None,
        }
    return card_out(card)


@router.put("/", response_model=ProfileOut)
async def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    card: Profile = Depends(require_active_card),
):
    profile = await profile_service.update_profile(db=db, profile=card, payload=payload)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return card_out(profile)
