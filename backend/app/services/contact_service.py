from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.database.models import Contact, Profile
from app.services.visibility import get_visibility


def _contact_details(db: Session, profile: Profile) -> tuple[str | None, str | None]:
    """Phone/email of the profile owner, honouring their privacy settings."""
    user = profile.user
    if not user:
        return None, None
    vis = get_visibility(db, profile.user_id)
    return (
        user.phone if vis.show_phone else None,
        user.email if vis.show_email else None,
    )


# -----------------------------
# ADD CONTACT (QR / NFC)
# -----------------------------
def add_contact(db: Session, owner_id, payload):
    profile = db.query(Profile).filter(Profile.id == payload.target_profile_id).first()
    if not profile or not profile.user:
        return None

    existing = db.query(Contact).filter(
        Contact.owner_id == owner_id,
        Contact.target_profile_id == profile.id,
    ).first()
    if existing:
        return existing

    phone, email = _contact_details(db, profile)

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
        saved_phone=phone,
        saved_email=email,
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


def _sync_snapshot(db: Session, contact: Contact) -> None:
    profile = contact.target_profile
    if not profile:
        return
    contact.saved_display_name = profile.display_name
    contact.saved_company = profile.company
    contact.saved_job_title = profile.job_title
    contact.saved_website = profile.website
    contact.saved_whatsapp = profile.whatsapp
    contact.saved_linkedin = profile.linkedin
    contact.saved_facebook = profile.facebook
    contact.saved_twitter = profile.twitter
    contact.avatar_url = profile.avatar_url
    contact.bio = profile.bio
    contact.saved_phone, contact.saved_email = _contact_details(db, profile)


# -----------------------------
# LIST CONTACTS (snapshot kept in sync with the live profile)
# -----------------------------
def list_contacts(db: Session, owner_id, skip=0, limit=50):
    contacts = (
        db.query(Contact)
        .options(joinedload(Contact.target_profile).joinedload(Profile.user))
        .filter(Contact.owner_id == owner_id)
        .order_by(Contact.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    for contact in contacts:
        _sync_snapshot(db, contact)
    db.commit()
    return contacts


def get_contact(db: Session, owner_id, contact_id):
    contact = (
        db.query(Contact)
        .options(joinedload(Contact.target_profile).joinedload(Profile.user))
        .filter(Contact.id == contact_id, Contact.owner_id == owner_id)
        .first()
    )
    if contact:
        _sync_snapshot(db, contact)
        db.commit()
    return contact


# -----------------------------
# SEARCH CONTACTS
# -----------------------------
def search_contacts(db: Session, owner_id, q: str):
    pattern = f"%{q}%"
    return (
        db.query(Contact)
        .filter(Contact.owner_id == owner_id)
        .filter(
            or_(
                Contact.saved_display_name.ilike(pattern),
                Contact.saved_company.ilike(pattern),
                Contact.saved_job_title.ilike(pattern),
                Contact.tag.ilike(pattern),
            )
        )
        .order_by(Contact.created_at.desc())
        .limit(100)
        .all()
    )


# -----------------------------
# DELETE CONTACT
# -----------------------------
def delete_contact(db: Session, owner_id, contact_id) -> bool:
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.owner_id == owner_id,
    ).first()
    if not contact:
        return False
    db.delete(contact)
    db.commit()
    return True


# -----------------------------
# USED BY PROFILE SERVICE
# -----------------------------
def get_all_owners_for_profile(db: Session, profile_id):
    return (
        db.query(Contact)
        .options(joinedload(Contact.owner))
        .filter(Contact.target_profile_id == profile_id)
        .all()
    )
