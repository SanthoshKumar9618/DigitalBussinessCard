import qrcode
import io
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.database.models import NFCLink, Profile, ProfileAudit
from app.config.settings import settings
from uuid import uuid4
from app.schemas.nfc_schema import NFCAssign

def generate_public_link(profile):
    return f"{settings.APP_DOMAIN}/public/{profile.slug}"

async def assign_nfc_to_profile(db: Session, user_id: str, payload):
    profile = db.query(Profile).filter(Profile.id == payload.profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    encoded = generate_public_link(profile)

    # Save NFC mapping
    mapping = NFCLink(uid=payload.uid, encoded_url=encoded, profile_id=profile.id)
    db.add(mapping)
    db.commit()

    # Log audit
    audit = ProfileAudit(
        profile_id=profile.id,
        action="nfc_mapped",
        extra_metadata=f"uid={payload.uid}"
    )
    db.add(audit)
    db.commit()

    return {
        "uid": payload.uid,
        "profile_slug": profile.slug,
        "public_url": encoded
    }

async def resolve_uid(db: Session, uid: str):
    mapping = (
        db.query(NFCLink)
        .join(Profile, NFCLink.profile_id == Profile.id)
        .filter(NFCLink.uid == uid)
        .first()
    )

    if not mapping:
        return None

    profile = mapping.profile

    # Log every scan
    audit = ProfileAudit(
        profile_id=profile.id,
        action="profile_view",
        extra_metadata="via=nfc"
    )
    db.add(audit)
    db.commit()

    return {
        "profile_id": str(profile.id),
        "display_name": profile.display_name,
        "company": profile.company,
        "job_title": profile.job_title,
        "avatar_url": profile.avatar_url,
        "website": profile.website,
        "slug": profile.slug,
        "public_url": mapping.encoded_url,
        "share_whatsapp": f"whatsapp://send?phone={profile.whatsapp}" if profile.whatsapp else None
    }

async def generate_qr_for_profile(db: Session, profile_id: str):
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    public_url = generate_public_link(profile)

    qr = qrcode.QRCode(border=1)
    qr.add_data(public_url)
    qr.make(fit=True)

    img = qr.make_image(fill="black", back_color="white")

    stream = io.BytesIO()
    img.save(stream, format="PNG")
    stream.seek(0)

    return stream, public_url
