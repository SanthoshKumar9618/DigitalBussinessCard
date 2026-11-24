"""AI features: status and paper business card scanning."""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config.settings import settings
from app.services import ai_service, plans
from app.utils import rate_limit
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/ai", tags=["AI"])

MAX_SCAN_BYTES = 8 * 1024 * 1024


@router.get("/status")
def ai_status(user=Depends(get_current_user)):
    enabled = ai_service.ai_enabled()
    return {"scan_card": enabled, "follow_up_drafts": enabled}


@router.post("/scan-card")
async def scan_card(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Read a photo of a paper business card. Returns fields for the user to review;
    nothing is saved until they confirm (POST /contacts/manual)."""
    if not ai_service.ai_enabled():
        raise HTTPException(status_code=503, detail="Card scanning isn't available yet.")
    data = await file.read(MAX_SCAN_BYTES + 1)
    if len(data) > MAX_SCAN_BYTES:
        raise HTTPException(status_code=413, detail="Photo too large (max 8 MB).")
    per_day = min(settings.AI_SCANS_PER_DAY, plans.plan_for(user).ai_scans_per_day)
    rate_limit.check(f"ai-scan:{user.id}", per_day, 86400)
    try:
        return ai_service.extract_business_card(data)
    except ai_service.AIRejected as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ai_service.AIUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
