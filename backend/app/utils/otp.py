import random
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

OTP_EXPIRY_MINUTES = 5


def generate_otp() -> str:
    return f"{random.randint(100000, 999999)}"


def hash_otp(otp: str) -> str:
    return pwd_context.hash(otp)


def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
    return pwd_context.verify(plain_otp, hashed_otp)


def otp_expiry_time():
    return datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
def is_otp_expired(expiry_time: datetime) -> bool:
    return datetime.now(timezone.utc) > expiry_time if expiry_time else True    
def send_otp_via_email(email: str, otp: str):
    # Placeholder function to send OTP via email
    print(f"Sending OTP {otp} to email {email}")        
def send_otp_via_sms(phone: str, otp: str):
    # Placeholder function to send OTP via SMS
    print(f"Sending OTP {otp} to phone {phone}")
def send_otp(user, via: str = "email"):
    otp = generate_otp()
    hashed_otp = hash_otp(otp)
    expiry_time = otp_expiry_time()

    if via == "email":
        user.email_otp = hashed_otp
    elif via == "phone":
        user.phone_otp = hashed_otp
    else:
        raise ValueError("Invalid method to send OTP. Use 'email' or 'phone'.")

    user.otp_expires_at = expiry_time

    if via == "email":
        send_otp_via_email(user.email, otp)
    else:
        send_otp_via_sms(user.phone, otp)
def verify_user_otp(user, input_otp: str, via: str = "email") -> bool:
    if is_otp_expired(user.otp_expires_at):
        return False

    if via == "email":
        hashed_otp = user.email_otp
    elif via == "phone":
        hashed_otp = user.phone_otp
    else:
        raise ValueError("Invalid method to verify OTP. Use 'email' or 'phone'.")

    return verify_otp(input_otp, hashed_otp)
def clear_user_otp(user, via: str = "email"):
    if via == "email":
        user.email_otp = None
    elif via == "phone":
        user.phone_otp = None
    else:
        raise ValueError("Invalid method to clear OTP. Use 'email' or 'phone'.")

    user.otp_expires_at = None
    

        