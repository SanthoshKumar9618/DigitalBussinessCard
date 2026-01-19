# backend/app/services/auth_service.py
import random
import string
from datetime import datetime, timedelta
from app.utils import otp
from app.utils.otp import hash_otp
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database.models import User, Profile, OTP
from app.schemas.user_schema import Token as TokenSchema
from passlib.context import CryptContext
from jose import jwt, JWTError
from app.utils.notification import send_email, send_sms
from app.config.settings import settings
from app.utils.otp import verify_otp as verify_hashed_otp


pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# env keys (match your .env)
# env keys from pydantic Settings
JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = settings.JWT_ALGORITHM
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
JWT_REFRESH_TOKEN_EXPIRE_DAYS = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS



# ----------------- Password Utilities -----------------
def _hash_password(pw: str) -> str:
    """
    Hash password with bcrypt, truncating to 72 bytes (bcrypt limit)
    """
    # Encode to bytes, truncate, decode safely
    pw_truncated = pw.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return pwd.hash(pw_truncated)


def _verify_password(plain: str, hashed: str) -> bool:
    plain_truncated = plain.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return pwd.verify(plain_truncated, hashed)


# ----------------- JWT Utilities -----------------
def _create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(subject), "exp": expire, "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _create_refresh_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(subject), "exp": expire, "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return {}


# ----------------- OTP Utilities -----------------
def _generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def _slug_from_name(name: str) -> str:
    base = "-".join(name.strip().lower().split())
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=3))
    return f"{base}-{suffix}"


# ----------------- User Lookups -----------------
def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email.lower().strip()).first()


def get_user_by_phone(db: Session, phone: str):
    return db.query(User).filter(User.phone == phone.strip()).first()

async def get_user_by_identifier(db: Session, identifier: str):
    """Get user by email or phone"""
    user = db.query(User).filter(User.email == identifier.lower().strip()).first()
    if user:
        return user
    return db.query(User).filter(User.phone == identifier.strip()).first()


def register_user(db: Session, payload) -> User | None:
    try:
        if get_user_by_email(db, payload.email):
            return None
        if get_user_by_phone(db, payload.phone):
            return None

        hashed = _hash_password(payload.password)

        user = User(
            name=payload.name.strip(),
            email=payload.email.lower().strip(),
            phone=payload.phone.strip(),
            password_hash=hashed,
            is_active=True,
            email_verified=False,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        # ✅ USER ONLY — NO PROFILE HERE
        return user

    except SQLAlchemyError as e:
        db.rollback()
        print("Register error:", e)
        return None



# ----------------- Authenticate -----------------
async def authenticate_user(db: Session, identifier: str, password: str) -> TokenSchema | None:
    user = await get_user_by_identifier(db, identifier)
    if not user or not user.password_hash:
        return None

    if not _verify_password(password, user.password_hash):
        return None

    access = _create_access_token(str(user.id))
    refresh = _create_refresh_token(str(user.id))
    return TokenSchema(access_token=access, refresh_token=refresh, token_type="bearer")


# ----------------- Refresh Token -----------------
async def refresh_access_token(db: Session, refresh_token: str) -> TokenSchema | None:
    payload = _decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        return None

    user_id = payload.get("sub")
    user = db.query(User).get(user_id)
    if not user:
        return None

    access = _create_access_token(str(user.id))
    refresh = _create_refresh_token(str(user.id))
    return TokenSchema(access_token=access, refresh_token=refresh, token_type="bearer")


# ----------------- OTP Flows -----------------
async def generate_and_send_otp(db: Session, identifier: str) -> bool:
    user = await get_user_by_identifier(db, identifier)
    if not user:
        return False

    code = "".join(random.choices("0123456789", k=6))
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    otp = OTP(
        identifier=identifier,
        code=code,              # ✅ plain text
        expires_at=expires_at,
        used=False
    )

    db.add(otp)
    db.commit()
    db.refresh(otp)

    sent = False
    try:
        from app.utils.notification import send_email, send_sms
    except ImportError:
        def send_email(to, subject, body):
            print("EMAIL:", to, subject, body)
            return True

        def send_sms(to, body):
            print("SMS:", to, body)
            return True

    # Send OTP
    if "@" in identifier:
        try:
            send_email(identifier, "OTP Verification", code)
            sent = True
        except Exception:
            pass
        if getattr(user, "phone", None):
            try:
                send_sms(user.phone, f"Your OTP is {code}. Expires in 10 minutes.")
                sent = True
            except Exception:
                pass
    else:
        try:
            send_sms(identifier, f"Your OTP is {code}. Expires in 10 minutes.")
            sent = True
        except Exception:
            pass
        if getattr(user, "email", None):
            try:
                send_email(user.email, "Your OTP", f"Your OTP is {code}. Expires in 10 minutes.")
                sent = True
            except Exception:
                pass

    return sent


async def verify_otp(db: Session, identifier: str, code: str) -> bool:
    now = datetime.utcnow()

    otp = db.query(OTP).filter(
        OTP.identifier == identifier,
        OTP.used == False,
        OTP.expires_at >= now
    ).order_by(OTP.created_at.desc()).first()

    if not otp:
        return False

    if otp.code != code:
        return False

    otp.used = True
    db.commit()
    return True




async def reset_password(db: Session, identifier: str, code: str, new_password: str) -> bool:
    if not await verify_otp(db, identifier, code):
        return False

    user = await get_user_by_identifier(db, identifier)
    if not user:
        return False

    user.password_hash = _hash_password(new_password)
    db.commit()
    return True

