from sqlalchemy.orm import Session

from app.database.models import User


def get_or_create_user_by_email(db: Session, email: str, name: str | None = None) -> User:
    email = email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if user:
        if not user.email_verified:
            # Google has verified this address. The unverified account may have
            # been pre-registered by someone else, so drop its password.
            user.email_verified = True
            user.password_hash = None
            db.commit()
        return user

    user = User(
        email=email,
        name=(name or email.split("@")[0]).strip(),
        is_active=True,
        email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
