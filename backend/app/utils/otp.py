import secrets
import threading
from datetime import datetime, timedelta, timezone

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

OTP_EXPIRY_MINUTES = 10
MAX_OTP_ATTEMPTS = 5

# Failed-attempt counters keyed by user id. In-process only: good enough for a
# single instance; move to Redis/DB if the API is scaled horizontally.
_failed_attempts: dict[str, int] = {}
_lock = threading.Lock()


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(otp: str) -> str:
    return pwd_context.hash(otp)


def verify_otp(plain_otp: str, hashed_otp: str | None) -> bool:
    if not plain_otp or not hashed_otp:
        return False
    try:
        return pwd_context.verify(plain_otp, hashed_otp)
    except (ValueError, TypeError):
        return False


def otp_expiry_time() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)


def is_otp_expired(expiry_time: datetime | None) -> bool:
    if not expiry_time:
        return True
    if expiry_time.tzinfo is None:
        expiry_time = expiry_time.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > expiry_time


def issue_user_otp(user, secret_suffix: str = "") -> str:
    """Generate an OTP, store its hash on the user and return the plain code.

    `secret_suffix` binds the OTP to extra data (e.g. a pending new email),
    so the same code cannot be replayed for a different value.
    """
    otp = generate_otp()
    user.email_otp = hash_otp(otp + secret_suffix)
    user.otp_expires_at = otp_expiry_time()
    with _lock:
        _failed_attempts.pop(str(user.id), None)
    return otp


def verify_user_otp(user, input_otp: str, via: str = "email", secret_suffix: str = "") -> bool:
    if via not in ("email", "phone"):
        raise ValueError("Invalid method to verify OTP. Use 'email' or 'phone'.")
    if is_otp_expired(user.otp_expires_at):
        return False

    hashed_otp = user.email_otp if via == "email" else user.phone_otp
    if not hashed_otp:
        return False

    key = str(user.id)
    if verify_otp((input_otp or "").strip() + secret_suffix, hashed_otp):
        with _lock:
            _failed_attempts.pop(key, None)
        return True

    with _lock:
        _failed_attempts[key] = _failed_attempts.get(key, 0) + 1
        too_many = _failed_attempts[key] >= MAX_OTP_ATTEMPTS
        if too_many:
            _failed_attempts.pop(key, None)
    if too_many:
        # Burn the OTP; the user must request a new one.
        clear_user_otp(user, via)
    return False


def clear_user_otp(user, via: str = "email"):
    if via == "email":
        user.email_otp = None
    elif via == "phone":
        user.phone_otp = None
    else:
        raise ValueError("Invalid method to clear OTP. Use 'email' or 'phone'.")
    user.otp_expires_at = None
