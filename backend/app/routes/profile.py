from app.database.models import Profile
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.profile_schema import ProfileCreate, ProfileOut, ProfileUpdate
from app.utils.jwt_handler import get_current_user
from app.services import profile_service

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.post("/", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
async def create_profile(
    payload: ProfileCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = await profile_service.create_profile(
        db=db,
        user=current_user,
        payload=payload,
    )

    return ProfileOut(
        id=str(profile.id),
        slug=profile.slug,
        avatar_url=profile.avatar_url,
        display_name=profile.display_name,
        job_title=profile.job_title,
        company=profile.company,
        bio=profile.bio,
        website=profile.website,
        linkedin=profile.linkedin,
        twitter=profile.twitter,
        facebook=profile.facebook,
        whatsapp=profile.whatsapp,
        email=current_user.email,
        phone=current_user.phone,
    )

@router.get("/me")
async def get_my_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = (
        db.query(Profile)
        .filter(Profile.user_id == current_user.id)
        .first()
    )

    if not profile:
        return {
            "id": None,
            "slug": None,
            "avatar_url": None,
            "display_name": current_user.name,
            "job_title": None,
            "company": None,
            "bio": None,
            "website": None,
            "linkedin": None,
            "twitter": None,
            "facebook": None,
            "whatsapp": None,
            "email": current_user.email,
            "phone": current_user.phone,
        }

    return {
        "id": str(profile.id),
        "slug": profile.slug,
        "avatar_url": profile.avatar_url,
        "display_name": profile.display_name,
        "job_title": profile.job_title,
        "company": profile.company,
        "bio": profile.bio,
        "website": profile.website,
        "linkedin": profile.linkedin,
        "twitter": profile.twitter,
        "facebook": profile.facebook,
        "whatsapp": profile.whatsapp,
        "email": current_user.email,
        "phone": current_user.phone,
    }


@router.put("/", response_model=ProfileOut)
async def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = await profile_service.update_profile(
    db=db,
    user_id=current_user.id,
    payload=payload
)

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return ProfileOut(
        id=str(profile.id),
        slug=profile.slug,
        avatar_url=profile.avatar_url,
        display_name=profile.display_name,
        job_title=profile.job_title,
        company=profile.company,
        bio=profile.bio,
        website=profile.website,
        linkedin=profile.linkedin,
        twitter=profile.twitter,
        facebook=profile.facebook,
        whatsapp=profile.whatsapp,
        email=current_user.email,   # important
        phone=current_user.phone    # important
    )

