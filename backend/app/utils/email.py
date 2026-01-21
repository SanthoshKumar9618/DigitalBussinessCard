import smtplib
from email.message import EmailMessage
from app.config.settings import settings



def send_otp_email(to_email: str, otp: str) -> bool:
    """
    TEMP MOCK — Render blocks SMTP.
    This must NOT make any network calls.
    """
    print(f"[EMAIL MOCK] To={to_email} | OTP={otp}")
    return True