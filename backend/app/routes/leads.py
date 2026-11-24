from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Lead
from app.services import analytics_service
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

    class Config:
        from_attributes = True


class LeadUpdate(BaseModel):
    is_read: bool


def _profile_id(user):
    if not user.profile:
        raise HTTPException(status_code=404, detail="Create your profile first")
    return user.profile.id


def _get_lead(db: Session, user, lead_id: UUID) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.profile_id == _profile_id(user)).first()
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
    if not user.profile:
        return []
    return (
        db.query(Lead)
        .filter(Lead.profile_id == user.profile.id)
        .order_by(Lead.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/leads/export.csv")
def export_leads(db: Session = Depends(get_db), user=Depends(get_current_user)):
    leads = []
    if user.profile:
        leads = db.query(Lead).filter(Lead.profile_id == user.profile.id).order_by(Lead.created_at.desc()).all()
    csv_text = build_csv(
        ["Name", "Email", "Phone", "Company", "Note", "Source", "Received"],
        [[l.name, l.email, l.phone, l.company, l.note, l.source, l.created_at.isoformat() if l.created_at else ""] for l in leads],
    )
    return Response(csv_text, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="leads.csv"'})


@router.patch("/leads/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: UUID, payload: LeadUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    lead = _get_lead(db, user, lead_id)
    lead.is_read = payload.is_read
    db.commit()
    db.refresh(lead)
    return lead


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
    user=Depends(get_current_user),
):
    return analytics_service.summary(db, _profile_id(user), days)
