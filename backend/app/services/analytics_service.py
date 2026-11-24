"""Profile engagement events and the Insights summary.

Events are stored in `profile_audits` (action + extra_metadata.via) so no new
table is needed. Actions used:
  profile_view, vcard_download, contact_saved, lead_submitted, link_click
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Lead, ProfileAudit

logger = logging.getLogger(__name__)

VALID_SOURCES = {"qr", "nfc", "link", "app"}
TRACKED_ACTIONS = ("profile_view", "vcard_download", "contact_saved", "lead_submitted")


def normalize_source(src: str | None) -> str:
    src = (src or "").lower().strip()
    return src if src in VALID_SOURCES else "link"


def log_event(db: Session, profile_id, action: str, via: str | None = None, commit: bool = True) -> None:
    """Record an event. Never let analytics break the user-facing request."""
    try:
        db.add(ProfileAudit(profile_id=profile_id, action=action, extra_metadata={"via": normalize_source(via)}))
        if commit:
            db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to log %s event", action)


def summary(db: Session, profile_id, days: int = 7) -> dict:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    rows = (
        db.query(ProfileAudit.action, func.count(ProfileAudit.id))
        .filter(
            ProfileAudit.profile_id == profile_id,
            ProfileAudit.created_at >= since,
            ProfileAudit.action.in_(TRACKED_ACTIONS),
        )
        .group_by(ProfileAudit.action)
        .all()
    )
    counts = {a: 0 for a in TRACKED_ACTIONS}
    counts.update({a: n for a, n in rows})

    # Daily views for the last 14 days (fixed window for the chart).
    chart_days = 14
    chart_since = now - timedelta(days=chart_days - 1)
    day_col = func.date(ProfileAudit.created_at)
    daily_rows = (
        db.query(day_col, func.count(ProfileAudit.id))
        .filter(
            ProfileAudit.profile_id == profile_id,
            ProfileAudit.action == "profile_view",
            ProfileAudit.created_at >= chart_since.replace(hour=0, minute=0, second=0, microsecond=0),
        )
        .group_by(day_col)
        .all()
    )
    by_day = {str(d): n for d, n in daily_rows}
    start = chart_since.date()
    daily = [
        {"date": (start + timedelta(days=i)).isoformat(), "views": by_day.get((start + timedelta(days=i)).isoformat(), 0)}
        for i in range(chart_days)
    ]

    # Where views came from (read the JSON in Python: portable across DBs).
    view_meta = (
        db.query(ProfileAudit.extra_metadata)
        .filter(
            ProfileAudit.profile_id == profile_id,
            ProfileAudit.action == "profile_view",
            ProfileAudit.created_at >= since,
        )
        .all()
    )
    sources: dict[str, int] = {}
    for (meta,) in view_meta:
        via = meta.get("via") if isinstance(meta, dict) else None
        key = normalize_source(via)
        sources[key] = sources.get(key, 0) + 1

    unread_leads = (
        db.query(func.count(Lead.id))
        .filter(Lead.profile_id == profile_id, Lead.is_read.is_(False))
        .scalar()
    )

    return {
        "days": days,
        "views": counts["profile_view"],
        "vcard_saves": counts["vcard_download"],
        "connections": counts["contact_saved"],
        "leads": counts["lead_submitted"],
        "unread_leads": unread_leads or 0,
        "sources": sources,
        "daily": daily,
    }
