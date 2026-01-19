from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.profile_schema import ProfileCreate, ProfileOut, ProfileUpdate
from app.utils.jwt_handler import get_current_user
from app.services import profile_service

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.post("/", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
async def create_profile(payload: ProfileCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return await profile_service.create_profile(db, current_user.id, payload)


@router.get("/me", response_model=ProfileOut)
async def get_my_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = await profile_service.get_profile_by_user(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Build combined response
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



@router.put("/", response_model=ProfileOut)
async def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = await profile_service.update_profile(db, current_user.id, payload)

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

