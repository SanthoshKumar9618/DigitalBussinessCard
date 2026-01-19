# backend/app/routes/auth.py
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import User
from app.schemas.user_schema import (
    UserCreate, UserOut, Token, UserLogin, ForgotPassword, VerifyEmail, VerifyOTP, ResetPassword
)
from app.services import auth_service
from app.utils.jwt_handler import get_current_user
from app.utils.email import send_otp_email
from app.utils.otp import generate_otp, hash_otp, otp_expiry_time,verify_user_otp, clear_user_otp



router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing_email = auth_service.get_user_by_email(db, payload.email)
    if existing_email:
        if existing_email.email_verified:
            raise HTTPException(status_code=400, detail="Email already registered")

        otp = generate_otp()
        existing_email.email_otp = hash_otp(otp)
        existing_email.otp_expires_at = otp_expiry_time()
        db.commit()
        send_otp_email(existing_email.email, otp)

        return {
            "message": "OTP resent to email",
            "user_id": str(existing_email.id)
        }

    existing_phone = auth_service.get_user_by_phone(db, payload.phone)
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone already registered")

    user = auth_service.register_user(db, payload)
    if not user:
        raise HTTPException(status_code=500, detail="Failed to create user")

    otp = generate_otp()
    user.email_otp = hash_otp(otp)
    user.otp_expires_at = otp_expiry_time()
    db.commit()
    send_otp_email(user.email, otp)

    return {
        "message": "OTP sent to email",
        "user_id": str(user.id)
    }


@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = await auth_service.get_user_by_identifier(db, payload.identifier)

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # 🔒 BLOCK LOGIN IF EMAIL NOT VERIFIED
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified"
        )

    token = await auth_service.authenticate_user(
        db,
        payload.identifier,
        payload.password
    )

    return {
        "access_token": token.access_token,
        "refresh_token": token.refresh_token,
        "token_type": "bearer"
    }



@router.post("/refresh", response_model=Token)
async def refresh(refresh_token: str, db: Session = Depends(get_db)):
    token = await auth_service.refresh_access_token(db, refresh_token)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return token


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPassword, db: Session = Depends(get_db)):
    ok = await auth_service.generate_and_send_otp(db, payload.identifier)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found or sending failed")
    return {"message": "OTP sent"}


@router.post("/verify-otp")
def verify_registration_otp(payload: VerifyOTP, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.identifier).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_user_otp(user, payload.otp, via="email"):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user.email_verified = True
    clear_user_otp(user, via="email")
    db.commit()

    return {"message": "Email verified successfully"}



@router.post("/reset-password")
async def reset_password(payload: ResetPassword, db: Session = Depends(get_db)):

    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match"
        )

    ok = await auth_service.reset_password(
        db,
        payload.identifier,
        payload.otp,
        payload.password
    )

    if not ok:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP"
        )

    return {"message": "Password reset successful"}



@router.post("/logout")
async def logout(current_user=Depends(get_current_user)):
    return {
        "detail": "Logged out successfully"
    }
    
@router.post("/verify-email", response_model=Token)
def verify_email(payload: VerifyEmail, db: Session = Depends(get_db)):
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.otp_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")

    if not verify_user_otp(user, payload.otp, via="email"):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user.email_verified = True
    clear_user_otp(user, via="email")
    db.commit()


    # ✅ AUTO LOGIN HERE
    access_token = auth_service._create_access_token(str(user.id))
    refresh_token = auth_service._create_refresh_token(str(user.id))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/resend-email-otp")
def resend_email_otp(user_id: str, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    otp = generate_otp()
    user.email_otp = hash_otp(otp)
    user.otp_expires_at = otp_expiry_time()

    db.commit()

    send_otp_email(user.email, otp)

    return {"message": "OTP resent to email"}
