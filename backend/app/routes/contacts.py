from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Contact
from app.config.settings import settings
from app.schemas.contact_schema import (
    ContactCreate, ContactManualCreate, ContactOut, ContactUpdate,
    FollowUpDraftIn, FollowUpDraftOut, RemindersOut,
)
from app.services import ai_service, events, plans
from app.services.cards import get_active_card
from app.utils import rate_limit
from app.utils.exporters import build_csv
from app.utils.jwt_handler import get_current_user
from app.services import contact_service

router = APIRouter(prefix="/contacts", tags=["Contacts"])


# -----------------------------
# SAVE CONTACT (QR / NFC)
# -----------------------------
@router.post("/", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def save_contact(
    payload: ContactCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    contact = contact_service.add_contact(db, current_user.id, payload)
    if not contact:
        raise HTTPException(status_code=404, detail="Profile not found")
    events.emit(db, current_user.id, "contact.saved", events.contact_data(contact))
    return contact


# -----------------------------
# LIST CONTACTS (AUTO LOAD)
# -----------------------------
@router.get("/", response_model=List[ContactOut])
def list_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return contact_service.list_contacts(db, current_user.id, skip, limit)


# -----------------------------
# SEARCH CONTACTS
# -----------------------------
@router.get("/search", response_model=List[ContactOut])
def search_contacts(
    q: str = Query(..., min_length=1, max_length=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return contact_service.search_contacts(db, current_user.id, q)



# -----------------------------
# MANUAL CONTACT (scanned card, typed in)
# -----------------------------
@router.post("/manual", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def save_manual_contact(
    payload: ContactManualCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    contact = contact_service.add_manual_contact(db, current_user.id, payload)
    events.emit(db, current_user.id, "contact.saved", events.contact_data(contact))
    return contact


# -----------------------------
# FOLLOW-UP REMINDERS
# -----------------------------
@router.get("/reminders", response_model=RemindersOut)
def list_reminders(
    tz_offset: int = Query(0, ge=-840, le=840, description="Minutes east of UTC, e.g. 330 for IST"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return contact_service.reminders(db, current_user.id, tz_offset)


# -----------------------------
# EXPORT CSV
# -----------------------------
@router.get("/export.csv")
def export_contacts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    contacts = contact_service.list_contacts(db, current_user.id, 0, 10_000)
    csv_text = build_csv(
        ["Name", "Job title", "Company", "Email", "Phone", "WhatsApp", "Website", "LinkedIn", "Address",
         "Tag", "Notes", "Met at", "Met on", "Follow up", "Source", "Saved"],
        [[c.saved_display_name, c.saved_job_title, c.saved_company, c.saved_email, c.saved_phone,
          c.saved_whatsapp, c.saved_website, c.saved_linkedin, c.saved_address, c.tag, c.notes,
          c.met_at, c.met_on.isoformat() if c.met_on else "",
          c.follow_up_at.isoformat() if c.follow_up_at and not c.follow_up_done else "",
          c.source, c.created_at.isoformat() if c.created_at else ""] for c in contacts],
    )
    return Response(csv_text, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="contacts.csv"'})


# -----------------------------
# GET ONE CONTACT
# -----------------------------
@router.get("/{contact_id}", response_model=ContactOut)
def get_contact(
    contact_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    contact = contact_service.get_contact(db, current_user.id, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


# -----------------------------
# UPDATE NOTES / TAG
# -----------------------------
@router.patch("/{contact_id}", response_model=ContactOut)
def update_contact(
    contact_id: UUID,
    payload: ContactUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    contact = contact_service.update_contact(db, current_user.id, contact_id, payload)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


# -----------------------------
# AI FOLLOW-UP DRAFT
# -----------------------------
@router.post("/{contact_id}/follow-up-draft", response_model=FollowUpDraftOut)
def follow_up_draft(
    contact_id: UUID,
    payload: FollowUpDraftIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    card=Depends(get_active_card),
):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.owner_id == current_user.id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if not ai_service.ai_enabled():
        raise HTTPException(status_code=503, detail="AI drafts aren't available yet.")
    per_day = min(settings.AI_DRAFTS_PER_DAY, plans.plan_for(current_user).ai_drafts_per_day)
    rate_limit.check(f"ai-draft:{current_user.id}", per_day, 86400)

    sender = {
        "name": (card.display_name if card else None) or current_user.name,
        "job title": card.job_title if card else None,
        "company": card.company if card else None,
        "profile link": settings.public_profile_url(card.slug) if card else None,
    }
    recipient = {
        "name": contact.saved_display_name,
        "job title": contact.saved_job_title,
        "company": contact.saved_company,
    }
    try:
        return ai_service.draft_follow_up(
            sender=sender, recipient=recipient, notes=contact.notes, tag=contact.tag,
            met_at=contact.met_at, met_on=contact.met_on or (contact.created_at.date() if contact.created_at else None),
            channel=payload.channel, tone=payload.tone, goal=payload.goal,
        )
    except ai_service.AIRejected as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ai_service.AIUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))


# -----------------------------
# DELETE CONTACT
# -----------------------------
@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    success = contact_service.delete_contact(
        db,
        current_user.id,
        contact_id
    )

    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
