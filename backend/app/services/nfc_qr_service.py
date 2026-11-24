import io

import qrcode
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.models import NFCLink, Profile, ProfileAudit, UserSettings
from app.services.visibility import get_visibility


def generate_public_link(profile, src: str | None = None) -> str:
    url = settings.public_profile_url(profile.slug)
    return f"{url}?src={src}" if src else url


def assign_nfc_to_profile(db: Session, user_id, payload):
    profile = db.query(Profile).filter(Profile.id == payload.profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    if profile.user_id != user_id:
        raise HTTPException(403, "You can only assign tags to your own profile")

    encoded = generate_public_link(profile, "nfc")

    mapping = db.query(NFCLink).filter(NFCLink.uid == payload.uid).first()
    if mapping:
        owner = db.query(Profile).filter(Profile.id == mapping.profile_id).first()
        if owner and owner.user_id != user_id:
            raise HTTPException(409, "This NFC tag is already linked to another account")
        mapping.profile_id = profile.id
        mapping.encoded_url = encoded
        mapping.active = True
    else:
        db.add(NFCLink(uid=payload.uid, encoded_url=encoded, profile_id=profile.id))

    db.add(ProfileAudit(
        profile_id=profile.id,
        action="nfc_mapped",
        extra_metadata={"uid": payload.uid},
    ))
    db.commit()

    return {
        "uid": payload.uid,
        "profile_slug": profile.slug,
        "public_url": encoded,
    }


def resolve_uid(db: Session, uid: str):
    mapping = (
        db.query(NFCLink)
        .filter(NFCLink.uid == uid, NFCLink.active.is_(True))
        .first()
    )
    if not mapping:
        return None

    profile = mapping.profile
    if not profile or not get_visibility(db, profile.user_id).public_profile:
        return None

    user_settings = db.query(UserSettings).filter(UserSettings.user_id == profile.user_id).first()
    if user_settings and user_settings.nfc_enabled is False:
        return None

    db.add(ProfileAudit(
        profile_id=profile.id,
        action="profile_view",
        extra_metadata={"via": "nfc"},
    ))
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
        "share_whatsapp": f"whatsapp://send?phone={profile.whatsapp}" if profile.whatsapp else None,
    }


def generate_qr_for_profile(db: Session, profile_id: str):
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    public_url = generate_public_link(profile, "qr")

    qr = qrcode.QRCode(border=1)
    qr.add_data(public_url)
    qr.make(fit=True)
    img = qr.make_image(fill="black", back_color="white")

    stream = io.BytesIO()
    img.save(stream, format="PNG")
    stream.seek(0)
    return stream, public_url
