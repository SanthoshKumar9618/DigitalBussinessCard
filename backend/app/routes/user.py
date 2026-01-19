# backend/app/routes/user.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/user", tags=["User"])

@router.put("")
def update_user(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if "phone" in payload:
        current_user.phone = payload["phone"]
        current_user.phone_verified = False

    db.commit()
    return {"message": "User updated"}


@router.post("/email/send-otp")
def send_email_change_otp(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    new_email = payload.get("email")
    if not new_email:
        raise HTTPException(400, "Email required")

    # prevent duplicates
    from app.database.models import User
    if db.query(User).filter(User.email == new_email).first():
        raise HTTPException(400, "Email already in use")

    from app.utils.otp import generate_otp, hash_otp, otp_expiry_time
    from app.utils.email import send_otp_email

    otp = generate_otp()
    current_user.email_otp = hash_otp(otp)
    current_user.otp_expires_at = otp_expiry_time()
    current_user.email_verified = False
    current_user.email = new_email

    db.commit()
    send_otp_email(new_email, otp)

    return {"message": "OTP sent to new email"}


@router.post("/email/verify-otp")
def verify_new_email(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.utils.otp import verify_user_otp, clear_user_otp

    otp = payload.get("otp")
    if not otp:
        raise HTTPException(400, "OTP required")

    if not verify_user_otp(current_user, otp, via="email"):
        raise HTTPException(400, "Invalid or expired OTP")

    current_user.email_verified = True
    clear_user_otp(current_user, via="email")

    db.commit()
    return {"message": "Email verified"}
