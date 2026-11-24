"""Custom profile URL (slug) and custom links."""
import re
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.connection import get_db
from app.database.models import NFCLink, Profile, ProfileLink, SlugAlias
from app.services import wallet_service
from app.services.cards import get_active_card, require_active_card
from urllib.parse import quote

router = APIRouter(prefix="/profile", tags=["Profile links"])

MAX_LINKS = 20
SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$")
RESERVED_SLUGS = {
    "admin", "api", "app", "about", "help", "login", "logout", "me", "new", "public", "register",
    "settings", "signup", "smartcard", "support", "view", "www", "vcard", "lead", "leads", "static",
    "uploads", "docs", "terms", "privacy", "auth", "profile", "card", "cards", "null", "undefined",
}


# ---------------------------------------------------------------- schemas
class LinkIn(BaseModel):
    label: str = Field(..., min_length=1, max_length=80)
    url: str = Field(..., min_length=4, max_length=1024)

    @field_validator("label")
    @classmethod
    def _label(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Label is required")
        return v

    @field_validator("url")
    @classmethod
    def _url(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[a-z][a-z0-9+.-]*://", v, re.I):
            v = "https://" + v  # "acme.io/blog" → https://acme.io/blog
        if not v.lower().startswith(("http://", "https://")) or "." not in v.split("://", 1)[1]:
            raise ValueError("Enter a valid web address")
        return v


class LinkOut(LinkIn):
    id: UUID
    position: int

    class Config:
        from_attributes = True


class LinkOrder(BaseModel):
    ids: List[UUID]


class SlugIn(BaseModel):
    slug: str


# ---------------------------------------------------------------- helpers
def _links(db: Session, profile_id) -> list[ProfileLink]:
    return (
        db.query(ProfileLink)
        .filter(ProfileLink.profile_id == profile_id)
        .order_by(ProfileLink.position, ProfileLink.created_at)
        .all()
    )


def slug_problem(db: Session, slug: str, profile: Profile | None = None) -> str | None:
    """Return a human-readable reason the slug can't be used, or None if it's free."""
    if not SLUG_RE.match(slug):
        return "Use 3–40 lowercase letters, numbers or hyphens (no hyphen at the start or end)."
    if "--" in slug:
        return "Avoid double hyphens."
    if slug in RESERVED_SLUGS:
        return "That address is reserved."
    owner = db.query(Profile).filter(Profile.slug == slug).first()
    if owner and (profile is None or owner.id != profile.id):
        return "That address is taken."
    alias = db.get(SlugAlias, slug)
    if alias and (profile is None or alias.profile_id != profile.id):
        return "That address is taken."
    return None


# ---------------------------------------------------------------- custom URL
@router.get("/slug/check")
def check_slug(slug: str, db: Session = Depends(get_db), card: Profile | None = Depends(get_active_card)):
    slug = slug.strip().lower()
    problem = slug_problem(db, slug, card)
    return {
        "slug": slug,
        "available": problem is None,
        "reason": problem,
        "url": settings.public_profile_url(slug),
    }


@router.put("/slug")
def change_slug(payload: SlugIn, db: Session = Depends(get_db), card: Profile = Depends(require_active_card)):
    profile = card
    new = payload.slug.strip().lower()
    if new == profile.slug:
        return {"slug": new, "url": settings.public_profile_url(new)}

    problem = slug_problem(db, new, profile)
    if problem:
        raise HTTPException(status_code=400, detail=problem)

    old = profile.slug
    # Keep the old address working (printed QR codes, NFC tags, shared links).
    if not db.get(SlugAlias, old):
        db.add(SlugAlias(slug=old, profile_id=profile.id))
    # If the user is taking back one of their own old addresses, it is no longer an alias.
    own_alias = db.get(SlugAlias, new)
    if own_alias:
        db.delete(own_alias)

    profile.slug = new
    for tag in db.query(NFCLink).filter(NFCLink.profile_id == profile.id).all():
        tag.encoded_url = f"{settings.public_profile_url(new)}?src=nfc"
    db.commit()
    return {"slug": new, "url": settings.public_profile_url(new)}


# ---------------------------------------------------------------- custom links
@router.get("/links", response_model=List[LinkOut])
def list_links(db: Session = Depends(get_db), card: Profile = Depends(require_active_card)):
    return _links(db, card.id)


@router.post("/links", response_model=LinkOut, status_code=status.HTTP_201_CREATED)
def add_link(payload: LinkIn, db: Session = Depends(get_db), card: Profile = Depends(require_active_card)):
    profile = card
    count = db.query(func.count(ProfileLink.id)).filter(ProfileLink.profile_id == profile.id).scalar() or 0
    if count >= MAX_LINKS:
        raise HTTPException(status_code=400, detail=f"You can add up to {MAX_LINKS} links.")
    last = db.query(func.max(ProfileLink.position)).filter(ProfileLink.profile_id == profile.id).scalar()
    link = ProfileLink(profile_id=profile.id, label=payload.label, url=payload.url, position=(last or 0) + 1)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.put("/links/order", response_model=List[LinkOut])
def reorder_links(payload: LinkOrder, db: Session = Depends(get_db), card: Profile = Depends(require_active_card)):
    profile = card
    links = {l.id: l for l in _links(db, profile.id)}
    if set(payload.ids) != set(links):
        raise HTTPException(status_code=400, detail="Send every link id exactly once.")
    for pos, link_id in enumerate(payload.ids, start=1):
        links[link_id].position = pos
    db.commit()
    return _links(db, profile.id)


@router.put("/links/{link_id}", response_model=LinkOut)
def update_link(link_id: UUID, payload: LinkIn, db: Session = Depends(get_db), card: Profile = Depends(require_active_card)):
    profile = card
    link = db.query(ProfileLink).filter(ProfileLink.id == link_id, ProfileLink.profile_id == profile.id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    link.label, link.url = payload.label, payload.url
    db.commit()
    db.refresh(link)
    return link


@router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(link_id: UUID, db: Session = Depends(get_db), card: Profile = Depends(require_active_card)):
    profile = card
    link = db.query(ProfileLink).filter(ProfileLink.id == link_id, ProfileLink.profile_id == profile.id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()


# ---------------------------------------------------------------- share kit
@router.get("/share-kit")
def share_kit(card: Profile = Depends(require_active_card)):
    """Everything the app needs for the Share kit screen."""
    profile = card
    base = settings.APP_DOMAIN.rstrip("/")
    slug = quote(profile.slug)
    return {
        "card_id": str(profile.id),
        "label": profile.label,
        "slug": profile.slug,
        "profile_url": settings.public_profile_url(profile.slug),
        "signature_url": f"{base}/public/{slug}/signature",
        "qr_png_url": f"{base}/public/{slug}/qr.png?size=10",
        "vcard_url": f"{base}/public/{slug}/vcard?src=link",
        "wallet": {
            "apple_url": f"{base}/public/{slug}/wallet/apple" if wallet_service.apple_enabled() else None,
            "google_url": f"{base}/public/{slug}/wallet/google" if wallet_service.google_enabled() else None,
        },
    }
