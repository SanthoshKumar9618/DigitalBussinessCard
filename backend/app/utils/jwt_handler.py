# app/utils/jwt_handler.py
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.connection import get_db
from app.database.models import User

# This is only for OpenAPI docs; not used for decoding logic
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

ALGORITHM = settings.JWT_ALGORITHM
SECRET_KEY = settings.JWT_SECRET


def _encode(subject: str, token_type: str, expires_delta: timedelta) -> str:
    to_encode = {
        "sub": str(subject),
        "exp": datetime.now(timezone.utc) + expires_delta,
        "type": token_type,
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    return _encode(
        subject,
        "access",
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    return _encode(
        subject,
        "refresh",
        expires_delta or timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return {}


def subject_to_uuid(payload: dict) -> UUID | None:
    try:
        return UUID(str(payload.get("sub")))
    except (ValueError, TypeError):
        return None


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalid or expired")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid access token")

    user_id = subject_to_uuid(payload)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return user
