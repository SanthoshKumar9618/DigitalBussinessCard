# backend/app/services/auth_service.py
import logging

from passlib.context import CryptContext
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.models import User
from app.schemas.user_schema import Token as TokenSchema
from app.utils.jwt_handler import create_access_token, create_refresh_token, decode_token, subject_to_uuid
from app.utils.notification import send_otp_email
from app.utils.otp import clear_user_otp, issue_user_otp, verify_user_otp

logger = logging.getLogger(__name__)

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ----------------- Password Utilities -----------------
def _truncate(pw: str) -> str:
    # bcrypt only uses the first 72 bytes
    return pw.encode("utf-8")[:72].decode("utf-8", errors="ignore")


def _hash_password(pw: str) -> str:
    return pwd.hash(_truncate(pw))


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd.verify(_truncate(plain), hashed)
    except (ValueError, TypeError):
        return False


# ----------------- JWT Utilities -----------------
def issue_tokens(user: User) -> TokenSchema:
    return TokenSchema(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        token_type="bearer",
    )


# ----------------- User Lookups -----------------
def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email.lower().strip()).first()


def get_user_by_phone(db: Session, phone: str):
    return db.query(User).filter(User.phone == phone.strip()).first()


def get_user_by_identifier(db: Session, identifier: str):
    """Get user by email or phone"""
    return get_user_by_email(db, identifier) or get_user_by_phone(db, identifier)


def register_user(db: Session, payload) -> User | None:
    try:
        if get_user_by_email(db, payload.email) or get_user_by_phone(db, payload.phone):
            return None

        user = User(
            name=payload.name.strip(),
            email=payload.email.lower().strip(),
            phone=payload.phone.strip(),
            password_hash=_hash_password(payload.password),
            is_active=True,
            email_verified=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Register failed")
        return None


# ----------------- Authenticate -----------------
def authenticate_user(db: Session, identifier: str, password: str) -> User | None:
    """Return the user only if the password is correct."""
    user = get_user_by_identifier(db, identifier)
    if not user or not user.password_hash or not user.is_active:
        return None
    if not _verify_password(password, user.password_hash):
        return None
    return user


# ----------------- Refresh Token -----------------
def refresh_access_token(db: Session, refresh_token: str) -> TokenSchema | None:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        return None

    user_id = subject_to_uuid(payload)
    user = db.get(User, user_id) if user_id else None
    if not user or not user.is_active:
        return None
    return issue_tokens(user)


# ----------------- Password reset (OTP) -----------------
def send_password_reset_otp(db: Session, identifier: str) -> None:
    """Send a reset OTP to the account's email. Silent if the user is unknown,
    so the endpoint can't be used to discover registered emails/phones."""
    user = get_user_by_identifier(db, identifier)
    if not user:
        return

    otp = issue_user_otp(user)
    db.commit()
    try:
        send_otp_email(user.email, otp)
    except Exception:
        logger.exception("Password reset OTP send failed")


def reset_password(db: Session, identifier: str, code: str, new_password: str) -> bool:
    user = get_user_by_identifier(db, identifier)
    if not user:
        return False

    if not verify_user_otp(user, code, via="email"):
        db.commit()  # persist OTP burn after too many attempts
        return False

    user.password_hash = _hash_password(new_password)
    # Receiving the OTP proves ownership of the email address.
    user.email_verified = True
    clear_user_otp(user, via="email")
    db.commit()
    return True
