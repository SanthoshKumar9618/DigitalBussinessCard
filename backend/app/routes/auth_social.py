from fastapi import APIRouter, HTTPException
from google.oauth2 import id_token
from google.auth.transport import requests

from app.schemas.auth_schema import SocialLoginSchema
from app.utils.jwt_handler import create_access_token
from app.services.user import get_or_create_user_by_email

GOOGLE_CLIENT_ID = "WEB_CLIENT_ID.apps.googleusercontent.com"

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/social-login")
def social_login(payload: SocialLoginSchema):
    if payload.provider == "google":
        try:
            user_data = id_token.verify_oauth2_token(
                payload.token,
                requests.Request(),
                GOOGLE_CLIENT_ID
            )
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid Google token")

        user = get_or_create_user_by_email(
            email=user_data["email"],
            google_id=user_data["sub"]
        )

    elif payload.provider == "apple":
        raise HTTPException(status_code=501, detail="Apple login not implemented")

    else:
        raise HTTPException(status_code=400, detail="Invalid provider")

    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token}
