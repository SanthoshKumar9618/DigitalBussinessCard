# backend/app/routes/auth.py
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import User
from app.schemas.user_schema import (
    ForgotPassword,
    RefreshTokenRequest,
    ResendEmailOTP,
    ResetPassword,
    Token,
    UserCreate,
    UserLogin,
    VerifyEmail,
    VerifyOTP,
)
from app.services import auth_service
from app.utils.jwt_handler import get_current_user
from app.utils.notification import send_otp_email
from app.utils.otp import clear_user_otp, issue_user_otp, verify_user_otp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


def _send_verification_otp(db: Session, user: User) -> None:
    otp = issue_user_otp(user)
    db.commit()
    try:
        send_otp_email(user.email, otp)
    except Exception:
        logger.exception("OTP send failed")


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing_email = auth_service.get_user_by_email(db, payload.email)
    if existing_email:
        if existing_email.email_verified:
            raise HTTPException(status_code=400, detail="Email already registered")
        _send_verification_otp(db, existing_email)
        return {"message": "OTP resent to email", "user_id": str(existing_email.id)}

    if auth_service.get_user_by_phone(db, payload.phone):
        raise HTTPException(status_code=400, detail="Phone already registered")

    user = auth_service.register_user(db, payload)
    if not user:
        raise HTTPException(status_code=500, detail="Failed to create user")

    _send_verification_otp(db, user)
    return {"message": "OTP sent to email", "user_id": str(user.id)}


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    # Check the password first so we don't reveal account status to strangers.
    user = auth_service.authenticate_user(db, payload.identifier, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")

    return auth_service.issue_tokens(user)


@router.post("/refresh", response_model=Token)
def refresh(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    token = auth_service.refresh_access_token(db, payload.refresh_token)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return token


@router.post("/forgot-password")
def forgot_password(payload: ForgotPassword, db: Session = Depends(get_db)):
    auth_service.send_password_reset_otp(db, payload.identifier)
    # Same response whether or not the account exists (prevents enumeration).
    return {"message": "If an account exists, an OTP has been sent"}


@router.post("/verify-otp")
def verify_registration_otp(payload: VerifyOTP, db: Session = Depends(get_db)):
    user = auth_service.get_user_by_email(db, payload.identifier)
    if not user or not verify_user_otp(user, payload.otp, via="email"):
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user.email_verified = True
    clear_user_otp(user, via="email")
    db.commit()
    return {"message": "Email verified successfully"}


@router.post("/reset-password")
def reset_password(payload: ResetPassword, db: Session = Depends(get_db)):
    ok = auth_service.reset_password(db, payload.identifier, payload.otp, payload.password)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    return {"message": "Password reset successful"}


@router.post("/logout")
def logout(current_user=Depends(get_current_user)):
    # Tokens are stateless; the client discards them.
    return {"detail": "Logged out successfully"}


@router.post("/verify-email", response_model=Token)
def verify_email(payload: VerifyEmail, db: Session = Depends(get_db)):
    user = db.get(User, payload.user_id)
    if not user or not verify_user_otp(user, payload.otp, via="email"):
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user.email_verified = True
    clear_user_otp(user, via="email")
    db.commit()

    # Auto-login after verification
    return auth_service.issue_tokens(user)


@router.post("/resend-email-otp")
def resend_email_otp(payload: ResendEmailOTP, db: Session = Depends(get_db)):
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    _send_verification_otp(db, user)
    return {"message": "OTP resent to email"}
