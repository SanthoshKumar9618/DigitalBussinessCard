from html import escape

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Profile
from app.services.visibility import get_visibility

router = APIRouter(prefix="/public", tags=["Public Profile"])


def _get_public_profile(db: Session, slug: str):
    profile = db.query(Profile).filter(Profile.slug == slug).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    vis = get_visibility(db, profile.user_id)
    if not vis.public_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile, vis


@router.get("/{slug}")
def get_public_profile(slug: str, db: Session = Depends(get_db)):
    profile, vis = _get_public_profile(db, slug)
    return {
        "id": profile.id,
        "slug": profile.slug,
        "display_name": profile.display_name,
        "job_title": profile.job_title,
        "company": profile.company,
        "bio": profile.bio,
        "avatar_url": profile.avatar_url,
        "website": profile.website,
        "linkedin": profile.linkedin,
        "twitter": profile.twitter,
        "facebook": profile.facebook,
        "whatsapp": profile.whatsapp,
        "email": profile.user.email if vis.show_email else None,
        "phone": profile.user.phone if vis.show_phone else None,
    }


@router.get("/view/{slug}", response_class=HTMLResponse)
def public_view(slug: str, db: Session = Depends(get_db)):
    """Simple HTML landing page for public profile links (web browsers)."""
    profile, _ = _get_public_profile(db, slug)

    name = escape(profile.display_name or "")
    subtitle = " - ".join(escape(x) for x in (profile.job_title, profile.company) if x)
    website_html = ""
    if profile.website and profile.website.lower().startswith(("http://", "https://")):
        w = escape(profile.website, quote=True)
        website_html = f"<p>Website: <a href=\"{w}\" target=\"_blank\" rel=\"noopener noreferrer\">{w}</a></p>"

    return f"""<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{name} | SmartCard</title></head>
<body style="font-family: Arial; text-align:center;">
    <h1>{name}</h1>
    <h3>{subtitle}</h3>
    {website_html}
</body>
</html>"""
