# backend/app/routes/user.py
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import User
from app.utils.jwt_handler import get_current_user
from app.utils.notification import send_otp_email
from app.utils.otp import clear_user_otp, issue_user_otp, verify_user_otp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["User"])


class UserUpdate(BaseModel):
    phone: str | None = None


class EmailChangeRequest(BaseModel):
    email: EmailStr


class EmailChangeVerify(BaseModel):
    email: EmailStr
    otp: str


@router.put("")
def update_user(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if payload.phone is not None:
        phone = payload.phone.strip() or None
        if phone and phone != current_user.phone:
            taken = db.query(User).filter(User.phone == phone, User.id != current_user.id).first()
            if taken:
                raise HTTPException(400, "Phone already in use")
        if phone != current_user.phone:
            current_user.phone = phone
            current_user.phone_verified = False

    db.commit()
    return {"message": "User updated"}


@router.post("/email/send-otp")
def send_email_change_otp(
    payload: EmailChangeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    new_email = payload.email.lower().strip()
    if new_email == current_user.email:
        raise HTTPException(400, "This is already your email")
    if db.query(User).filter(User.email == new_email).first():
        raise HTTPException(400, "Email already in use")

    # The account email is NOT changed yet. The OTP is bound to the new address
    # and the change only happens once that OTP is verified.
    otp = issue_user_otp(current_user, secret_suffix=":" + new_email)
    db.commit()
    try:
        send_otp_email(new_email, otp)
    except Exception:
        logger.exception("Email-change OTP send failed")

    return {"message": "OTP sent to new email"}


@router.post("/email/verify-otp")
def verify_new_email(
    payload: EmailChangeVerify,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    new_email = payload.email.lower().strip()
    if not verify_user_otp(current_user, payload.otp, via="email", secret_suffix=":" + new_email):
        db.commit()
        raise HTTPException(400, "Invalid or expired OTP")

    if db.query(User).filter(User.email == new_email, User.id != current_user.id).first():
        raise HTTPException(400, "Email already in use")

    current_user.email = new_email
    current_user.email_verified = True
    clear_user_otp(current_user, via="email")
    db.commit()
    return {"message": "Email verified"}
