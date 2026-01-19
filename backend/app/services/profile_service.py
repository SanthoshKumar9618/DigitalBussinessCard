from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.database.models import Profile
from slugify import slugify
from app.services.contact_service import get_all_owners_for_profile
from app.utils.notification import send_email

async def create_profile(db, user_id, payload):
    existing = db.query(Profile).filter(Profile.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")

    base_slug = slugify(payload.display_name)
    slug = base_slug

    # Ensure slug unique
    counter = 1
    while db.query(Profile).filter(Profile.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    profile = Profile(
        user_id=user_id,
        slug=slug,
        display_name=payload.display_name,
        job_title=payload.job_title,
        company=payload.company,
        bio=payload.bio,
        website=payload.website,
        linkedin=payload.linkedin,
        twitter=payload.twitter,
        facebook=payload.facebook,
        whatsapp=payload.whatsapp,
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


async def update_profile(db: Session, user_id: str, payload):
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        return None

    # Detect changed fields for notifications
    updated_fields = {}

    # Convert HttpUrl to string if exists
    if payload.display_name is not None and payload.display_name != profile.display_name:
        updated_fields["Name"] = f"{profile.display_name} → {payload.display_name}"
        profile.display_name = payload.display_name

    if payload.job_title is not None and payload.job_title != profile.job_title:
        updated_fields["Job Title"] = f"{profile.job_title or 'N/A'} → {payload.job_title}"
        profile.job_title = payload.job_title

    if payload.company is not None and payload.company != profile.company:
        updated_fields["Company"] = f"{profile.company or 'N/A'} → {payload.company}"
        profile.company = payload.company

    if payload.bio is not None and payload.bio != profile.bio:
        updated_fields["Bio"] = f"{profile.bio or 'N/A'} → {payload.bio}"
        profile.bio = payload.bio

    if payload.website is not None:
        website_str = str(payload.website)
        if website_str != (profile.website or ""):
            updated_fields["Website"] = f"{profile.website or 'N/A'} → {website_str}"
            profile.website = website_str

    if payload.linkedin is not None and payload.linkedin != profile.linkedin:
        updated_fields["LinkedIn"] = f"{profile.linkedin or 'N/A'} → {payload.linkedin}"
        profile.linkedin = payload.linkedin

    if payload.twitter is not None and payload.twitter != profile.twitter:
        updated_fields["Twitter"] = f"{profile.twitter or 'N/A'} → {payload.twitter}"
        profile.twitter = payload.twitter

    if payload.facebook is not None and payload.facebook != profile.facebook:
        updated_fields["Facebook"] = f"{profile.facebook or 'N/A'} → {payload.facebook}"
        profile.facebook = payload.facebook

    if payload.whatsapp is not None and payload.whatsapp != profile.whatsapp:
        updated_fields["WhatsApp"] = f"{profile.whatsapp or 'N/A'} → {payload.whatsapp}"
        profile.whatsapp = payload.whatsapp

    db.commit()
    db.refresh(profile)

    # Notify contacts who saved this profile if something changed
    if updated_fields:
        try:
            owners = await get_all_owners_for_profile(db, str(profile.id))
            for record in owners:
                try:
                    message = "The contact you saved has updated information:\n\n"
                    for k, v in updated_fields.items():
                        message += f"- {k}: {v}\n"

                    message += f"\nView Profile: https://yourapp.com/u/{profile.slug}"

                    send_email(
                        to=record.owner.email,
                        subject="Contact Updated!",
                        body=message
                    )
                except Exception as e:
                    print(f"Email error for {record.owner.email}: {e}")
        except Exception as e:
            print(f"Error getting profile owners: {e}")

    return profile


async def get_profile_by_slug(db: Session, slug: str):
    return db.query(Profile).filter(Profile.slug == slug).first()

async def get_profile_by_user(db: Session, user_id: str):
    return (
        db.query(Profile)
        .filter(Profile.user_id == user_id)
        .first()
    )