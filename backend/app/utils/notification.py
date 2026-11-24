# backend/app/utils/notification.py
"""Outgoing email / SMS.

No real provider is wired in yet (Render blocks SMTP), so these are mocks.
OTP codes are only ever written to the log in development, never in production.
"""
import logging

from app.config.settings import settings

logger = logging.getLogger(__name__)


def _is_dev() -> bool:
    return settings.ENVIRONMENT.lower() != "production"


def send_email(to: str, subject: str, body: str | None = None) -> bool:
    if _is_dev():
        logger.info("[EMAIL MOCK] To=%s | Subject=%s | Body=%s", to, subject, body)
    else:
        logger.info("[EMAIL MOCK] To=%s | Subject=%s", to, subject)
    return True


def send_otp_email(to: str, otp: str) -> bool:
    if _is_dev():
        logger.info("[EMAIL MOCK][DEV] OTP for %s: %s", to, otp)
    else:
        logger.warning("[EMAIL MOCK] No email provider configured; OTP for %s was not delivered", to)
    return True


def send_sms(to_phone: str, message: str) -> bool:
    if _is_dev():
        logger.info("[SMS MOCK] To=%s | Message=%s", to_phone, message)
    else:
        logger.info("[SMS MOCK] To=%s", to_phone)
    return True
