from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy import or_
from app.database.models import Contact, Profile, User

# -----------------------------
# ADD CONTACT (QR / NFC)
# -----------------------------
def add_contact(db: Session, owner_id: str, payload):
    profile = db.query(Profile).filter(Profile.id == payload.target_profile_id).first()
    if not profile:
        return None

    user = db.query(User).filter(User.id == profile.user_id).first()
    if not user:
        return None

    # Prevent duplicate save
    existing = db.query(Contact).filter(
        Contact.owner_id == owner_id,
        Contact.target_profile_id == profile.id
    ).first()
    if existing:
        return existing

    contact = Contact(
        owner_id=owner_id,
        target_profile_id=profile.id,

        # SNAPSHOT
        saved_display_name=profile.display_name,
        saved_company=profile.company,
        saved_job_title=profile.job_title,
        saved_website=profile.website,
        saved_linkedin=profile.linkedin,
        saved_facebook=profile.facebook,
        saved_twitter=profile.twitter,
        saved_whatsapp=profile.whatsapp,

        saved_phone=user.phone,
        saved_email=user.email,

        avatar_url=profile.avatar_url,
        bio=profile.bio,

        tag=payload.tag,
        notes=payload.notes,
        source=payload.source,
    )

    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


# -----------------------------
# LIST CONTACTS (AUTO DISPLAY FIX)
# -----------------------------
def list_contacts(db: Session, owner_id: str, skip=0, limit=50):
    return (
        db.query(Contact)
        .filter(Contact.owner_id == owner_id)
        .order_by(Contact.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# -----------------------------
# SEARCH CONTACTS
# -----------------------------
def search_contacts(db: Session, owner_id: str, q: str):
    return (
        db.query(Contact)
        .filter(Contact.owner_id == owner_id)
        .filter(
            or_(
                Contact.saved_display_name.ilike(f"%{q}%"),
                Contact.saved_company.ilike(f"%{q}%"),
                Contact.saved_job_title.ilike(f"%{q}%"),
                Contact.tag.ilike(f"%{q}%"),
            )
        )
        .order_by(Contact.created_at.desc())
        .all()
    )



# -----------------------------
# DELETE CONTACT
# -----------------------------
def delete_contact(db: Session, owner_id: str, contact_id: str) -> bool:
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.owner_id == owner_id
    ).first()

    if not contact:
        return False

    db.delete(contact)
    db.commit()
    return True


# -----------------------------
# USED BY PROFILE SERVICE (KEEP)
# -----------------------------
def get_all_owners_for_profile(db: Session, profile_id: str):
    return (
        db.query(Contact)
        .filter(Contact.target_profile_id == profile_id)
        .all()
    )
