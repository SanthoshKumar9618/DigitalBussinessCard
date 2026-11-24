"""What parts of a user's profile other people may see (from UserSettings)."""
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.database.models import UserSettings


@dataclass
class Visibility:
    public_profile: bool = True
    show_phone: bool = False
    show_email: bool = False


def get_visibility(db: Session, user_id) -> Visibility:
    s = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not s:
        # No settings saved yet: profile is public, contact details hidden.
        return Visibility()
    return Visibility(
        public_profile=s.public_profile is not False,
        show_phone=bool(s.show_phone),
        show_email=bool(s.show_email),
    )
