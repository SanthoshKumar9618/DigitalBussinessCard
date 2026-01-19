# app/services/profile_card_service.py

import uuid
from app.database.models import ProfileCardSettings

# app/services/profile_card_service.py

def get_or_create_card_settings(db, profile_id):
    settings = (
        db.query(ProfileCardSettings)
        .filter(ProfileCardSettings.profile_id == profile_id)
        .first()
    )

    if not settings:
        settings = ProfileCardSettings(profile_id=profile_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


def update_card_settings(db, profile_id, payload):
    settings = get_or_create_card_settings(db, profile_id)

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings
