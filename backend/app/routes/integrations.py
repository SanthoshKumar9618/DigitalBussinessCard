"""Webhooks (Zapier / Make / n8n) and HubSpot CRM sync."""
import secrets
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Contact, Integration, Lead, Webhook
from app.services import crypto, events, hubspot, plans
from app.utils.jwt_handler import get_current_user

router = APIRouter(prefix="/integrations", tags=["Integrations"])


class WebhookIn(BaseModel):
    url: str = Field(..., max_length=1024)
    events: List[str] = Field(default_factory=lambda: list(events.EVENT_TYPES))

    @field_validator("events")
    @classmethod
    def _events(cls, v):
        bad = [e for e in v if e not in events.EVENT_TYPES]
        if bad or not v:
            raise ValueError(f"Events must be from: {', '.join(events.EVENT_TYPES)}")
        return sorted(set(v))


class WebhookPatch(BaseModel):
    active: bool | None = None
    events: List[str] | None = None


class HubSpotIn(BaseModel):
    access_token: str = Field(..., min_length=10, max_length=500)
    auto_sync: bool = True


class HubSpotPatch(BaseModel):
    auto_sync: bool


def _hook_out(h: Webhook, include_secret: bool = False) -> dict:
    out = {
        "id": str(h.id), "url": h.url, "events": h.events, "active": h.active,
        "last_status": h.last_status, "last_delivery_at": h.last_delivery_at,
        "failure_count": h.failure_count,
    }
    if include_secret:
        out["secret"] = h.secret
    return out


def _own_hook(db: Session, user, hook_id: UUID) -> Webhook:
    hook = db.query(Webhook).filter(Webhook.id == hook_id, Webhook.user_id == user.id).first()
    if not hook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return hook


def _hubspot(db: Session, user) -> Integration | None:
    return db.query(Integration).filter(Integration.user_id == user.id, Integration.provider == "hubspot").first()


# ---------------------------------------------------------------- overview
@router.get("")
def overview(db: Session = Depends(get_db), user=Depends(get_current_user)):
    plan = plans.plan_for(user)
    hs = _hubspot(db, user)
    return {
        "event_types": list(events.EVENT_TYPES),
        "webhooks_allowed": plan.webhooks,
        "crm_allowed": plan.crm_sync,
        "webhooks": [_hook_out(h) for h in db.query(Webhook).filter(Webhook.user_id == user.id).all()],
        "hubspot": {
            "connected": bool(hs),
            "auto_sync": hs.auto_sync if hs else None,
            "last_sync_at": hs.last_sync_at if hs else None,
            "last_sync_count": hs.last_sync_count if hs else None,
            "last_error": hs.last_error if hs else None,
        },
    }


# ---------------------------------------------------------------- webhooks
@router.post("/webhooks", status_code=status.HTTP_201_CREATED)
def add_webhook(payload: WebhookIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    plan = plans.require(user, "webhooks")
    if db.query(Webhook).filter(Webhook.user_id == user.id).count() >= plan.max_webhooks:
        raise HTTPException(status_code=400, detail=f"Your plan allows up to {plan.max_webhooks} webhooks.")
    problem = events.url_problem(payload.url.strip())
    if problem:
        raise HTTPException(status_code=400, detail=problem)
    hook = Webhook(user_id=user.id, url=payload.url.strip(), events=payload.events,
                   secret="whsec_" + secrets.token_hex(24), active=True)
    db.add(hook)
    db.commit()
    db.refresh(hook)
    # The secret is shown once; use it to verify X-SmartCard-Signature.
    return _hook_out(hook, include_secret=True)


@router.patch("/webhooks/{hook_id}")
def update_webhook(hook_id: UUID, payload: WebhookPatch, db: Session = Depends(get_db), user=Depends(get_current_user)):
    hook = _own_hook(db, user, hook_id)
    if payload.events is not None:
        hook.events = WebhookIn(url=hook.url, events=payload.events).events
    if payload.active is not None:
        hook.active = payload.active
        if payload.active:
            hook.failure_count = 0
    db.commit()
    return _hook_out(hook)


@router.delete("/webhooks/{hook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook(hook_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db.delete(_own_hook(db, user, hook_id))
    db.commit()


@router.post("/webhooks/{hook_id}/test")
def test_webhook(hook_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    hook = _own_hook(db, user, hook_id)
    payload = events.envelope("lead.created", {
        "lead_id": "test", "card_id": None, "card_label": "Test", "name": "Test Lead",
        "email": "test@example.com", "phone": None, "company": "Example Co", "note": "This is a test event",
        "source": "test", "created_at": None,
    })
    ok, status_text = events.deliver_webhook(hook.id, hook.url, hook.secret, payload, retries=False)
    return {"ok": ok, "status": status_text}


# ---------------------------------------------------------------- HubSpot
@router.put("/hubspot")
def connect_hubspot(payload: HubSpotIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    plans.require(user, "crm_sync")
    token = payload.access_token.strip()
    try:
        hubspot.verify_token(token)
    except hubspot.HubSpotError as e:
        raise HTTPException(status_code=400, detail=str(e))
    integ = _hubspot(db, user)
    if not integ:
        integ = Integration(user_id=user.id, provider="hubspot", access_token_enc="")
        db.add(integ)
    integ.access_token_enc = crypto.encrypt(token)
    integ.auto_sync = payload.auto_sync
    integ.last_error = None
    db.commit()
    return {"connected": True, "auto_sync": integ.auto_sync}


@router.patch("/hubspot")
def update_hubspot(payload: HubSpotPatch, db: Session = Depends(get_db), user=Depends(get_current_user)):
    integ = _hubspot(db, user)
    if not integ:
        raise HTTPException(status_code=404, detail="HubSpot isn't connected")
    integ.auto_sync = payload.auto_sync
    db.commit()
    return {"connected": True, "auto_sync": integ.auto_sync}


@router.delete("/hubspot", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_hubspot(db: Session = Depends(get_db), user=Depends(get_current_user)):
    integ = _hubspot(db, user)
    if integ:
        db.delete(integ)
        db.commit()


@router.post("/hubspot/sync", status_code=status.HTTP_202_ACCEPTED)
def sync_hubspot(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Push every contact and lead that has an email to HubSpot (in the background)."""
    plans.require(user, "crm_sync")
    integ = _hubspot(db, user)
    token = crypto.decrypt(integ.access_token_enc) if integ else None
    if not token:
        raise HTTPException(status_code=400, detail="Connect HubSpot first")
    records = [events.contact_data(c) for c in db.query(Contact).filter(Contact.owner_id == user.id).all()]
    card_ids = [p.id for p in user.profiles]
    if card_ids:
        for lead in db.query(Lead).filter(Lead.profile_id.in_(card_ids)).all():
            records.append({"name": lead.name, "email": lead.email, "phone": lead.phone, "company": lead.company})
    with_email = [r for r in records if r.get("email")]
    events._pool.submit(events._crm_sync, integ.id, token, with_email)
    return {"queued": len(with_email), "skipped_without_email": len(records) - len(with_email)}
