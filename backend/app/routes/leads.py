from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Lead, Profile
from app.services.cards import require_active_card
from app.schemas.contact_schema import ContactManualCreate, ContactOut
from app.services import analytics_service, contact_service
from app.utils.exporters import build_csv
from app.utils.jwt_handler import get_current_user

router = APIRouter(tags=["Leads & Insights"])


class LeadOut(BaseModel):
    id: UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    note: Optional[str] = None
    source: Optional[str] = None
    is_read: bool
    created_at: datetime
    card_id: Optional[UUID] = None
    card_label: Optional[str] = None

    class Config:
        from_attributes = True


class LeadUpdate(BaseModel):
    is_read: bool


def _card_ids(user) -> list:
    return [p.id for p in user.profiles]


def _out(lead: Lead) -> dict:
    data = LeadOut.model_validate(lead).model_dump()
    data["card_id"] = lead.profile_id
    data["card_label"] = lead.profile.label if lead.profile else None
    return data


def _get_lead(db: Session, user, lead_id: UUID) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.profile_id.in_(_card_ids(user))).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


# ---------------- Leads ----------------
@router.get("/leads", response_model=List[LeadOut])
def list_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """One inbox for all of the user's cards; each lead says which card it came from."""
    ids = _card_ids(user)
    if not ids:
        return []
    leads = (
        db.query(Lead)
        .filter(Lead.profile_id.in_(ids))
        .order_by(Lead.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_out(l) for l in leads]


@router.get("/leads/export.csv")
def export_leads(db: Session = Depends(get_db), user=Depends(get_current_user)):
    ids = _card_ids(user)
    leads = db.query(Lead).filter(Lead.profile_id.in_(ids)).order_by(Lead.created_at.desc()).all() if ids else []
    csv_text = build_csv(
        ["Name", "Email", "Phone", "Company", "Note", "Card", "Source", "Received"],
        [[l.name, l.email, l.phone, l.company, l.note, l.profile.label if l.profile else "", l.source,
          l.created_at.isoformat() if l.created_at else ""] for l in leads],
    )
    return Response(csv_text, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="leads.csv"'})


@router.patch("/leads/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: UUID, payload: LeadUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    lead = _get_lead(db, user, lead_id)
    lead.is_read = payload.is_read
    db.commit()
    db.refresh(lead)
    return _out(lead)


@router.post("/leads/{lead_id}/to-contact", status_code=status.HTTP_201_CREATED)
def lead_to_contact(lead_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Save a lead into the user's network as a contact (keeps the lead, marks it read)."""
    lead = _get_lead(db, user, lead_id)
    contact = contact_service.add_manual_contact(db, user.id, ContactManualCreate(
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        whatsapp=lead.phone,
        company=lead.company,
        notes=lead.note,
        met_on=lead.created_at.date() if lead.created_at else None,
        source="lead",
    ))
    lead.is_read = True
    db.commit()
    return ContactOut.model_validate(contact)


@router.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    lead = _get_lead(db, user, lead_id)
    db.delete(lead)
    db.commit()


# ---------------- Insights ----------------
@router.get("/analytics/summary")
def analytics_summary(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    card: Profile = Depends(require_active_card),
):
    """Insights for the active card (X-Card-Id header, default: primary)."""
    return {**analytics_service.summary(db, card.id, days), "card_id": str(card.id), "card_label": card.label}
