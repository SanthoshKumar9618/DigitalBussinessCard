from sqlalchemy.orm import Session
from app.database.models import UserSettings

def get_or_create_settings(db: Session, user_id: str):
    settings = db.query(UserSettings).filter_by(user_id=user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_settings(db: Session, user_id: str, payload):
    settings = get_or_create_settings(db, user_id)

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(settings, key, value)

    db.commit()
    db.refresh(settings)
    return settings
