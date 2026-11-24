"""Plans and what each one allows.

Billing isn't live yet, so every user without an explicit plan gets
settings.DEFAULT_PLAN (default "team" = everything on). When billing ships,
set DEFAULT_PLAN=free and assign paid plans per user (users.plan) or per team.
"""
from dataclasses import asdict, dataclass

from fastapi import HTTPException

from app.config.settings import settings


@dataclass(frozen=True)
class Plan:
    key: str
    name: str
    max_cards: int
    max_links: int
    ai_scans_per_day: int
    ai_drafts_per_day: int
    insights_days: int
    webhooks: bool
    max_webhooks: int
    crm_sync: bool
    teams: bool
    max_team_seats: int


PLANS: dict[str, Plan] = {
    "free": Plan("free", "Free", max_cards=1, max_links=5, ai_scans_per_day=5, ai_drafts_per_day=10,
                 insights_days=7, webhooks=False, max_webhooks=0, crm_sync=False, teams=False, max_team_seats=0),
    "pro": Plan("pro", "Pro", max_cards=5, max_links=20, ai_scans_per_day=30, ai_drafts_per_day=60,
                insights_days=90, webhooks=True, max_webhooks=5, crm_sync=True, teams=False, max_team_seats=0),
    "team": Plan("team", "Team", max_cards=5, max_links=20, ai_scans_per_day=30, ai_drafts_per_day=60,
                 insights_days=90, webhooks=True, max_webhooks=10, crm_sync=True, teams=True, max_team_seats=50),
}


def plan_for(user) -> Plan:
    """The user's own plan, upgraded to their team's plan if they're an active member."""
    own = PLANS.get((user.plan or settings.DEFAULT_PLAN or "free").lower(), PLANS["free"])
    from app.database.models import TeamMember  # local import: avoid cycles

    session = _session_of(user)
    if session is not None:
        tm = (
            session.query(TeamMember)
            .filter(TeamMember.user_id == user.id, TeamMember.status == "active")
            .first()
        )
        if tm and tm.team:
            team_plan = PLANS.get(tm.team.plan, own)
            order = list(PLANS)
            if order.index(team_plan.key) > order.index(own.key):
                return team_plan
    return own


def _session_of(obj):
    from sqlalchemy.orm import object_session
    return object_session(obj)


def require(user, feature: str) -> Plan:
    plan = plan_for(user)
    if not getattr(plan, feature):
        raise HTTPException(status_code=403, detail=f"Your {plan.name} plan doesn't include this. Upgrade to unlock it.")
    return plan


def plan_dict(plan: Plan) -> dict:
    return asdict(plan)
