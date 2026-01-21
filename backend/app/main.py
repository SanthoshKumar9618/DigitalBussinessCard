from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.routes import (
    auth, profile, public_profile, contacts,
    categories, nfc_qr, profile_card as profile_card_router,
    auth_social, profile_avatar, settings as settings_router, user
)
from app.database.connection import Base
from app.config.settings import settings

app = FastAPI(
    title="Smart Contact API",
    description="Authentication + OTP + Profiles",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # production-safe for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(public_profile.router)
app.include_router(contacts.router)
app.include_router(categories.router)
app.include_router(nfc_qr.router)
app.include_router(profile_avatar.router)
app.include_router(settings_router.router)
app.include_router(profile_card_router.router)
app.include_router(auth_social.router)
app.include_router(user.router)

@app.get("/")
def root():
    return {"message": "Backend running successfully"}
