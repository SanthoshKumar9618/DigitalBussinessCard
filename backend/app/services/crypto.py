"""Symmetric encryption for secrets stored in the database (CRM tokens)."""
import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.config.settings import settings


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = settings.INTEGRATIONS_ENCRYPTION_KEY
    if not key:
        # Derived key: stable as long as JWT_SECRET doesn't change.
        digest = hashlib.sha256((settings.JWT_SECRET + "|integrations-v1").encode()).digest()
        key = base64.urlsafe_b64encode(digest).decode()
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt(token: str) -> str | None:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except (InvalidToken, ValueError):
        return None
