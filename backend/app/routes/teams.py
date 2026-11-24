"""Teams: one company account with members, branding and a shared dashboard.

A user belongs to at most one team. Invites are bound to an email address:
only a signed-in user with that (verified) email can accept.
"""
import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.connection import get_db
from app.database.models import Lead, ProfileAudit, Team, TeamMember
from app.services import plans
from app.utils.exporters import build_csv
from app.utils.jwt_handler import get_current_user
from app.utils.notification import send_email

router = APIRouter(prefix="/teams", tags=["Teams"])

HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


# ---------------------------------------------------------------- schemas
class TeamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    brand_company: Optional[str] = Field(None, max_length=255)
    brand_logo_url: Optional[str] = Field(None, max_length=1024)
    brand_color: Optional[str] = None

    @field_validator("brand_color")
    @classmethod
    def _color(cls, v):
        if v in (None, ""):
            return v
        if not HEX.match(v):
            raise ValueError("Use a hex colour like #1E40AF")
        return v.upper()

    @field_validator("brand_logo_url")
    @classmethod
    def _logo(cls, v):
        if v in (None, ""):
            return v
        if not v.lower().startswith("https://"):
            raise ValueError("Logo must be an https:// image URL")
        return v


class InviteIn(BaseModel):
    email: EmailStr
    role: Literal["member", "admin"] = "member"


class RoleIn(BaseModel):
    role: Literal["member", "admin"]


class JoinIn(BaseModel):
    token: str = Field(..., min_length=20, max_length=200)


# ---------------------------------------------------------------- helpers
def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _membership(db: Session, user) -> TeamMember | None:
    return db.query(TeamMember).filter(TeamMember.user_id == user.id, TeamMember.status == "active").first()


def _require_member(db: Session, user, admin: bool = False) -> TeamMember:
    m = _membership(db, user)
    if not m:
        raise HTTPException(status_code=404, detail="You're not in a team")
    if admin and m.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only team admins can do this")
    return m


def _team_out(team: Team) -> dict:
    return {
        "id": str(team.id), "name": team.name, "plan": team.plan,
        "brand_company": team.brand_company, "brand_logo_url": team.brand_logo_url, "brand_color": team.brand_color,
    }


def _member_out(m: TeamMember) -> dict:
    card = m.user.profile if m.user else None
    return {
        "id": str(m.id), "email": m.email, "role": m.role, "status": m.status,
        "name": (card.display_name if card else None) or (m.user.name if m.user else None),
        "job_title": card.job_title if card else None,
        "card_slug": card.slug if card else None,
        "avatar_url": card.avatar_url if card else None,
        "invited_at": m.invited_at, "joined_at": m.joined_at,
    }


def _seats_used(team: Team) -> int:
    return sum(1 for m in team.members if m.status in ("active", "invited"))


# ---------------------------------------------------------------- my team
@router.get("/me")
def my_team(db: Session = Depends(get_db), user=Depends(get_current_user)):
    m = _membership(db, user)
    if not m:
        invites = (
            db.query(TeamMember)
            .filter(func.lower(TeamMember.email) == user.email.lower(), TeamMember.status == "invited")
            .all()
        )
        return {
            "team": None,
            "can_create": plans.plan_for(user).teams,
            "invites": [{"id": str(i.id), "team_name": i.team.name, "role": i.role} for i in invites],
        }
    team = m.team
    is_admin = m.role in ("owner", "admin")
    return {
        "team": _team_out(team),
        "my_role": m.role,
        "seats": {"used": _seats_used(team), "max": plans.PLANS.get(team.plan, plans.PLANS["team"]).max_team_seats},
        "members": [_member_out(x) for x in team.members if is_admin or x.status == "active"],
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_team(payload: TeamCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    plans.require(user, "teams")
    if _membership(db, user):
        raise HTTPException(status_code=400, detail="You're already in a team. Leave it first.")
    team = Team(name=payload.name.strip(), owner_id=user.id, plan="team")
    db.add(team)
    db.flush()
    db.add(TeamMember(team_id=team.id, user_id=user.id, email=user.email.lower(), role="owner",
                      status="active", joined_at=datetime.now(timezone.utc)))
    db.commit()
    return _team_out(team)


@router.patch("/me")
def update_team(payload: TeamUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    team = _require_member(db, user, admin=True).team
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(team, field, (value.strip() if isinstance(value, str) else value) or None)
    if not team.name:
        raise HTTPException(status_code=400, detail="Team name is required")
    db.commit()
    return _team_out(team)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(db: Session = Depends(get_db), user=Depends(get_current_user)):
    m = _require_member(db, user)
    if m.role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can delete the team")
    db.delete(m.team)
    db.commit()


@router.post("/me/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_team(db: Session = Depends(get_db), user=Depends(get_current_user)):
    m = _require_member(db, user)
    if m.role == "owner":
        raise HTTPException(status_code=400, detail="The owner can't leave. Delete the team or transfer it first.")
    db.delete(m)
    db.commit()


# ---------------------------------------------------------------- invites
@router.post("/me/invites", status_code=status.HTTP_201_CREATED)
def invite(payload: InviteIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    team = _require_member(db, user, admin=True).team
    email = payload.email.lower()
    max_seats = plans.PLANS.get(team.plan, plans.PLANS["team"]).max_team_seats
    if _seats_used(team) >= max_seats:
        raise HTTPException(status_code=400, detail=f"Your team has used all {max_seats} seats.")
    existing = db.query(TeamMember).filter(TeamMember.team_id == team.id, func.lower(TeamMember.email) == email).first()
    if existing and existing.status == "active":
        raise HTTPException(status_code=400, detail="They're already in your team.")

    token = secrets.token_urlsafe(32)
    if existing:  # re-invite: new token, invalidates the old link
        existing.invite_token_hash = _hash(token)
        existing.role = payload.role
        existing.invited_at = datetime.now(timezone.utc)
        member = existing
    else:
        member = TeamMember(team_id=team.id, email=email, role=payload.role, status="invited", invite_token_hash=_hash(token))
        db.add(member)
    db.commit()

    link = f"smartcard://team/join?token={token}"
    send_email(
        email,
        f"Join {team.name} on SmartCard",
        f"{user.name} invited you to join {team.name} on SmartCard.\n"
        f"Open the SmartCard app with this email address to accept, or tap: {link}",
    )
    return {"id": str(member.id), "email": email, "role": member.role, "token": token, "link": link}


@router.post("/join")
def join_with_token(payload: JoinIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    m = db.query(TeamMember).filter(TeamMember.invite_token_hash == _hash(payload.token), TeamMember.status == "invited").first()
    if not m:
        raise HTTPException(status_code=404, detail="This invite link is invalid or has been used.")
    return _accept(db, user, m)


@router.post("/invites/{invite_id}/accept")
def accept_invite(invite_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    m = db.query(TeamMember).filter(TeamMember.id == invite_id, TeamMember.status == "invited").first()
    if not m:
        raise HTTPException(status_code=404, detail="Invite not found")
    return _accept(db, user, m)


def _accept(db: Session, user, m: TeamMember) -> dict:
    if m.email.lower() != user.email.lower() or not user.email_verified:
        raise HTTPException(status_code=403, detail="This invite was sent to a different email address.")
    if m.invited_at and m.invited_at.replace(tzinfo=m.invited_at.tzinfo or timezone.utc) < datetime.now(timezone.utc) - timedelta(days=14):
        raise HTTPException(status_code=410, detail="This invite has expired. Ask for a new one.")
    if _membership(db, user):
        raise HTTPException(status_code=400, detail="You're already in a team. Leave it first.")
    m.user_id = user.id
    m.status = "active"
    m.invite_token_hash = None
    m.joined_at = datetime.now(timezone.utc)
    db.commit()
    return _team_out(m.team)


# ---------------------------------------------------------------- members
def _target(db: Session, team: Team, member_id: UUID) -> TeamMember:
    t = db.query(TeamMember).filter(TeamMember.id == member_id, TeamMember.team_id == team.id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Member not found")
    return t


@router.patch("/me/members/{member_id}")
def change_role(member_id: UUID, payload: RoleIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    me = _require_member(db, user)
    if me.role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can change roles")
    t = _target(db, me.team, member_id)
    if t.role == "owner":
        raise HTTPException(status_code=400, detail="The owner's role can't be changed")
    t.role = payload.role
    db.commit()
    return _member_out(t)


@router.delete("/me/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(member_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    me = _require_member(db, user, admin=True)
    t = _target(db, me.team, member_id)
    if t.role == "owner":
        raise HTTPException(status_code=400, detail="The owner can't be removed")
    if t.role == "admin" and me.role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can remove an admin")
    db.delete(t)
    db.commit()


# ---------------------------------------------------------------- dashboard
@router.get("/me/dashboard")
def dashboard(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), user=Depends(get_current_user)):
    team = _require_member(db, user, admin=True).team
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows, totals = [], {"views": 0, "leads": 0, "connections": 0}
    for m in team.members:
        if m.status != "active" or not m.user:
            continue
        card_ids = [p.id for p in m.user.profiles]
        counts = {"profile_view": 0, "lead_submitted": 0, "contact_saved": 0}
        if card_ids:
            for action, n in (
                db.query(ProfileAudit.action, func.count(ProfileAudit.id))
                .filter(ProfileAudit.profile_id.in_(card_ids), ProfileAudit.created_at >= since,
                        ProfileAudit.action.in_(list(counts)))
                .group_by(ProfileAudit.action)
                .all()
            ):
                counts[action] = n
        row = {**_member_out(m), "views": counts["profile_view"], "leads": counts["lead_submitted"],
               "connections": counts["contact_saved"]}
        rows.append(row)
        totals["views"] += row["views"]
        totals["leads"] += row["leads"]
        totals["connections"] += row["connections"]
    rows.sort(key=lambda r: (r["leads"], r["views"]), reverse=True)
    return {"days": days, "totals": totals, "members": rows}


@router.get("/me/leads/export.csv")
def export_team_leads(db: Session = Depends(get_db), user=Depends(get_current_user)):
    team = _require_member(db, user, admin=True).team
    owner_names, card_ids = {}, []
    for m in team.members:
        if m.status == "active" and m.user:
            for p in m.user.profiles:
                card_ids.append(p.id)
                owner_names[p.id] = p.display_name or m.user.name
    leads = db.query(Lead).filter(Lead.profile_id.in_(card_ids)).order_by(Lead.created_at.desc()).all() if card_ids else []
    csv_text = build_csv(
        ["Team member", "Card", "Name", "Email", "Phone", "Company", "Note", "Source", "Received"],
        [[owner_names.get(l.profile_id), l.profile.label if l.profile else "", l.name, l.email, l.phone,
          l.company, l.note, l.source, l.created_at.isoformat() if l.created_at else ""] for l in leads],
    )
    return Response(csv_text, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{re.sub(r"[^A-Za-z0-9]+", "-", team.name)}-leads.csv"'})


# ---------------------------------------------------------------- branding lookup (used by public pages)
def team_brand(db: Session, user_id) -> dict | None:
    m = db.query(TeamMember).filter(TeamMember.user_id == user_id, TeamMember.status == "active").first()
    if not m or not m.team:
        return None
    t = m.team
    if not (t.brand_color or t.brand_logo_url or t.brand_company):
        return None
    return {"name": t.name, "company": t.brand_company, "logo_url": t.brand_logo_url, "color": t.brand_color}
