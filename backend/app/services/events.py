"""Domain events -> outgoing webhooks and CRM auto-sync.

emit() collects what to send inside the request (DB reads only) and hands the
network work to a background pool, so API responses never wait on third parties.
"""
import hashlib
import hmac
import ipaddress
import json
import logging
import socket
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.connection import SessionLocal
from app.database.models import Integration, User, Webhook
from app.services import crypto, hubspot, plans

logger = logging.getLogger(__name__)

EVENT_TYPES = ("lead.created", "contact.saved")
RETRY_DELAYS = (0, 3, 15)  # seconds before attempts 1, 2, 3

_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="events")
# Tests point this at their own database.
session_factory = SessionLocal


# ---------------------------------------------------------------- URL safety (SSRF)
def url_problem(url: str) -> str | None:
    """Why this URL may not receive webhooks, or None if it's fine."""
    try:
        u = urlparse(url)
    except ValueError:
        return "Invalid URL"
    allowed = ("https",) if settings.ENVIRONMENT.lower() == "production" else ("https", "http")
    if u.scheme not in allowed or not u.hostname:
        return "Use an https:// URL"
    try:
        infos = socket.getaddrinfo(u.hostname, u.port or (443 if u.scheme == "https" else 80))
    except socket.gaierror:
        return "That host can't be found"
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            return "Webhooks can't point to private or internal addresses"
    return None


def sign(secret: str, timestamp: int, body: bytes) -> str:
    mac = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={mac}"


# ---------------------------------------------------------------- delivery
def _post(url: str, secret: str, payload: dict) -> tuple[bool, str]:
    problem = url_problem(url)  # re-check at send time (DNS may have changed)
    if problem:
        return False, problem
    body = json.dumps(payload, default=str).encode()
    ts = int(time.time())
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "User-Agent": "SmartCard-Webhooks/1.0",
            "X-SmartCard-Event": payload["type"],
            "X-SmartCard-Delivery": payload["id"],
            "X-SmartCard-Signature": sign(secret, ts, body),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return 200 <= resp.status < 300, f"HTTP {resp.status}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}"
    except Exception as e:  # network errors
        return False, type(e).__name__


def deliver_webhook(webhook_id, url: str, secret: str, payload: dict, retries: bool = True) -> tuple[bool, str]:
    ok, status = False, ""
    for delay in RETRY_DELAYS if retries else (0,):
        if delay:
            time.sleep(delay)
        ok, status = _post(url, secret, payload)
        if ok:
            break
    _record(webhook_id, ok, status)
    return ok, status


def _record(webhook_id, ok: bool, status: str) -> None:
    db = session_factory()
    try:
        hook = db.get(Webhook, webhook_id)
        if hook:
            hook.last_status = status[:40]
            hook.last_delivery_at = datetime.now(timezone.utc)
            hook.failure_count = 0 if ok else (hook.failure_count or 0) + 1
            if hook.failure_count >= 20:
                hook.active = False  # stop hammering a dead endpoint
            db.commit()
    except Exception:
        logger.exception("Couldn't record webhook delivery")
        db.rollback()
    finally:
        db.close()


def _crm_sync(integration_id, token: str, records: list[dict]) -> None:
    db = session_factory()
    try:
        integ = db.get(Integration, integration_id)
        try:
            n = hubspot.upsert_contacts(token, records)
            if integ:
                integ.last_sync_at = datetime.now(timezone.utc)
                integ.last_sync_count = n
                integ.last_error = None
        except hubspot.HubSpotError as e:
            if integ:
                integ.last_error = str(e)[:500]
        db.commit()
    except Exception:
        logger.exception("CRM sync failed")
        db.rollback()
    finally:
        db.close()


# ---------------------------------------------------------------- public API
def envelope(event_type: str, data: dict) -> dict:
    return {
        "id": f"evt_{uuid.uuid4().hex}",
        "type": event_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data": data,
    }


def emit(db: Session, user_id, event_type: str, data: dict) -> None:
    """Queue webhooks and CRM sync for `user_id`. Never raises into the caller."""
    try:
        user = db.get(User, user_id)
        if not user:
            return
        plan = plans.plan_for(user)
        payload = envelope(event_type, data)

        if plan.webhooks:
            for hook in db.query(Webhook).filter(Webhook.user_id == user_id, Webhook.active.is_(True)).all():
                if event_type in (hook.events or []):
                    _pool.submit(deliver_webhook, hook.id, hook.url, hook.secret, payload)

        if plan.crm_sync and data.get("email"):
            integ = (
                db.query(Integration)
                .filter(Integration.user_id == user_id, Integration.provider == "hubspot", Integration.auto_sync.is_(True))
                .first()
            )
            token = crypto.decrypt(integ.access_token_enc) if integ else None
            if integ and token:
                _pool.submit(_crm_sync, integ.id, token, [data])
    except Exception:
        logger.exception("Event emit failed for %s", event_type)


def lead_data(lead, card) -> dict:
    return {
        "lead_id": str(lead.id), "card_id": str(card.id), "card_label": card.label,
        "name": lead.name, "email": lead.email, "phone": lead.phone, "company": lead.company,
        "note": lead.note, "source": lead.source,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }


def contact_data(c) -> dict:
    return {
        "contact_id": str(c.id), "name": c.saved_display_name, "email": c.saved_email, "phone": c.saved_phone,
        "company": c.saved_company, "job_title": c.saved_job_title, "website": c.saved_website,
        "met_at": c.met_at, "source": c.source, "has_smartcard": c.target_profile_id is not None,
    }
