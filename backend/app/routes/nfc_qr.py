from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.nfc_schema import NFCAssign, NFCResolveOut, QRGenerate
from app.services import nfc_qr_service
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/nfc", tags=["NFC / QR"])

@router.post("/assign", response_model=Any)
async def assign_nfc(payload: NFCAssign, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return await nfc_qr_service.assign_nfc_to_profile(db, current_user.id, payload)

@router.get("/resolve/{uid}", response_model=NFCResolveOut)
async def resolve_nfc(uid: str, db: Session = Depends(get_db)):
    profile = await nfc_qr_service.resolve_uid(db, uid)
    if not profile:
        raise HTTPException(404, "NFC tag not mapped")
    return profile

@router.post("/qr", response_class=StreamingResponse)
async def generate_qr(payload: QRGenerate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    qr_stream, public_url = await nfc_qr_service.generate_qr_for_profile(db, str(payload.profile_id))
    return StreamingResponse(qr_stream, media_type="image/png", headers={"X-PUBLIC-URL": public_url})
