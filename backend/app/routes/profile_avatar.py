from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import io
import uuid
import os

from PIL import Image, UnidentifiedImageError
from app.database.models import ProfileAudit
from app.database.connection import get_db
from app.utils.jwt_handler import get_current_user
from app.database.models import Profile

router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)

UPLOAD_DIR = "uploads/avatars"
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
# Pillow format name -> extension we store the file under
ALLOWED_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB

os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_extension(filename: str | None) -> str:
    if not filename or "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()

@router.post("/avatar", include_in_schema=False)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = (
        db.query(Profile)
        .filter(Profile.user_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    ext = get_extension(file.filename)

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only jpg, jpeg, png, webp allowed."
        )

    data = await file.read(MAX_AVATAR_BYTES + 1)
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 5 MB)")

    # Make sure the bytes really are an image of an allowed type.
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
            fmt = img.format
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise HTTPException(status_code=400, detail="File is not a valid image")
    if fmt not in ALLOWED_FORMATS:
        raise HTTPException(status_code=400, detail="Invalid file type. Only jpg, jpeg, png, webp allowed.")

    filename = f"{uuid.uuid4()}.{ALLOWED_FORMATS[fmt]}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        buffer.write(data)

    # (Optional) delete old avatar
    if profile.avatar_url:
        old_filename = os.path.basename(profile.avatar_url)
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)

    profile.avatar_url = f"/uploads/avatars/{filename}"
    audit = ProfileAudit(
    profile_id=profile.id,
    action="avatar_uploaded"
   )
    db.add(audit)
    db.commit()
    db.refresh(profile)
    return {"avatar_url": profile.avatar_url}

@router.delete("/avatar", include_in_schema=False)
async def delete_avatar(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = (
        db.query(Profile)
        .filter(Profile.user_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile.avatar_url:
        filename = os.path.basename(profile.avatar_url)
        file_path = os.path.join(UPLOAD_DIR, filename)

        if os.path.exists(file_path):
            os.remove(file_path)

    profile.avatar_url = None
    audit = ProfileAudit(
    profile_id=profile.id,
    action="avatar_deleted"
     )
    db.add(audit)
    db.commit()
    return {"detail": "Avatar deleted successfully"}
