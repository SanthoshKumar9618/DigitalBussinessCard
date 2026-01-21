# backend/app/utils/notification.py
import logging
from app.config.settings import settings

# ---------------- Email ----------------
def send_email(to: str, subject: str, otp: str = None, body: str = None) -> bool:
    """
    Send email.
    In production: use email provider (SendGrid / Resend).
    On Render: SMTP is blocked, so we mock safely.
    """

    if settings.ENVIRONMENT == "production":
        # 🔴 SMTP is blocked on Render → use API provider later
        logging.info(f"[EMAIL MOCK][PROD] To={to} | Subject={subject} | OTP={otp}")
        return True

    # 🟢 Local / dev mode
    if otp:
        logging.info(f"[EMAIL MOCK][DEV] To={to} | Subject={subject} | OTP={otp}")
    elif body:
        logging.info(f"[EMAIL MOCK][DEV] To={to} | Subject={subject} | Body={body}")
    else:
        logging.info(f"[EMAIL MOCK][DEV] To={to} | Subject={subject}")

    return True


# ---------------- SMS ----------------
def send_sms(to_phone: str, message: str) -> bool:
    logging.info(f"[SMS MOCK] To={to_phone} | Message={message}")
    return True


# ---------------- OTP Dispatcher ----------------
def send_otp(email: str = None, phone: str = None, otp: str = None, background_tasks=None):
    subject = "Your OTP Code"

    if email:
        send_email(email, subject, otp)

    if phone:
        send_sms(phone, f"Your OTP is {otp}")

    return True
