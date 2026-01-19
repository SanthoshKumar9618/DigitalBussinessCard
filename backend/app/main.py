from app.routes import profile_avatar
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth , profile, public_profile, contacts, categories,nfc_qr , profile_card as profile_card_router ,auth_social
from app.database.connection import Base, engine
from app.config.settings import settings
from fastapi.staticfiles import StaticFiles
import os
from app.routes import settings as settings_router
from app.routes import user



#from app.core.config import settings

# Create tables (only for safety if Alembic not applied yet — optional)
# Alembic is the main migrations manager
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Contact API",
    description="Authentication + OTP + Profiles",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENV") != "production" else None,
    redoc_url=None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # React dev server
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ROUTES
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

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

print("Loaded JWT_SECRET:", settings.JWT_SECRET)


@app.get("/", tags=["Root"])
def root():
    return {"message": "Backend running successfully 🚀"}
