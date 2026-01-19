from app.database import models
from app.routes import profile
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.services import profile_service
from fastapi.responses import HTMLResponse
from app.database.models import Profile


router = APIRouter(prefix="/public", tags=["Public Profile"])


@router.get("/{slug}")
async def get_public_profile(slug: str, db: Session = Depends(get_db)):
    # 1️⃣ Get profile FIRST
    profile = (
        db.query(models.Profile)
        .filter(models.Profile.slug == slug)
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # 2️⃣ Now profile exists → safe to use user_id
    settings = (
        db.query(models.UserSettings)
        .filter(models.UserSettings.user_id == profile.user_id)
        .first()
    )

    return {
    "id": profile.id,                 # ⭐ ADD THIS
    "slug": profile.slug,             # ⭐ ADD THIS

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
    "email": (
    profile.user.email
    if settings and settings.show_email
    else None
    ),
   "phone": (
    profile.user.phone
    if settings and settings.show_phone
    else None
    ),

}



@router.get("/view/{slug}", response_class=HTMLResponse)
async def public_view(slug: str, db: Session = Depends(get_db)):
    """
    Simple HTML landing page for public profile links (web browsers).
    """
    profile = db.query(Profile).filter(Profile.slug == slug).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    return f"""
    <html>
    <head><title>{profile.display_name} | SmartCard</title></head>
    <body style='font-family: Arial; text-align:center;'>
        <h1>{profile.display_name}</h1>
        <h3>{profile.job_title or ''} - {profile.company or ''}</h3>
        <p>Website: <a href='{profile.website}' target='_blank'>{profile.website}</a></p>
    </body>
    </html>
    """