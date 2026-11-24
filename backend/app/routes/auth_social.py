from fastapi import APIRouter, Depends, HTTPException
from google.auth.transport import requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.connection import get_db
from app.schemas.auth_schema import SocialLoginSchema
from app.schemas.user_schema import Token
from app.services import auth_service
from app.services.user import get_or_create_user_by_email

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/social-login", response_model=Token)
def social_login(payload: SocialLoginSchema, db: Session = Depends(get_db)):
    if payload.provider == "apple":
        raise HTTPException(status_code=501, detail="Apple login not implemented")

    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google login is not configured")

    try:
        user_data = id_token.verify_oauth2_token(
            payload.token, requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = user_data.get("email")
    if not email or not user_data.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google account email is not verified")

    user = get_or_create_user_by_email(db, email=email, name=user_data.get("name"))
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    return auth_service.issue_tokens(user)
