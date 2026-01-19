from app.database.models import User
from app.database.connection import get_db
from sqlalchemy.orm import Session

def get_or_create_user_by_email(email: str, google_id: str | None = None):
    db: Session = next(get_db())

    user = db.query(User).filter(User.email == email).first()
    if user:
        if google_id and not user.google_id:
            user.google_id = google_id
            db.commit()
        return user

    user = User(
        email=email,
        google_id=google_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
