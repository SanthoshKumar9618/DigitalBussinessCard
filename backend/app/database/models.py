# backend/app/database/models.py
import uuid
from sqlalchemy import (
    Integer,
    Date,
    Column,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid

from .connection import Base


class User(Base):
    __tablename__ = "users"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name = Column(String(length=255), nullable=False)
    email = Column(String(length=255), nullable=False, unique=True, index=True)
    phone = Column(String(length=50), nullable=True, unique=True, index=True)

    password_hash = Column(String(length=255), nullable=True)

    # Verification flags
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)

    # OTP handling
    email_otp = Column(String(length=255), nullable=True)
    phone_otp = Column(String(length=255), nullable=True)

    otp_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Google 2FA
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(length=255), nullable=True)

    is_active = Column(Boolean, default=True)

    # Plan: free | pro | team. NULL = settings.DEFAULT_PLAN (billing not live yet)
    plan = Column(String(length=20), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # A user can have several cards (work, personal…). Exactly one is primary.
    profiles = relationship(
        "Profile",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by=lambda: [Profile.is_primary.desc(), Profile.created_at],
    )

    @property
    def profile(self):
        """The primary card (or None). Kept for code that predates multiple cards."""
        return self.profiles[0] if self.profiles else None

    def __repr__(self):
        return f"<User {self.email}>"



class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_profiles_slug"),
        Index("ix_profiles_user_id", "user_id"),
        Index(
            "uq_profiles_one_primary_per_user", "user_id", unique=True,
            postgresql_where=text("is_primary"), sqlite_where=text("is_primary"),
        ),
    )

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(length=140), nullable=False, unique=True, index=True)  # public URL slug
    display_name = Column(String(length=255), nullable=False)
    job_title = Column(String(length=255), nullable=True)
    company = Column(String(length=255), nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(length=1024), nullable=True)
    website = Column(String(length=1024), nullable=True)

    # Social handles (store as simple strings; if you want, make separate table)
    linkedin = Column(String(length=512), nullable=True)
    twitter = Column(String(length=512), nullable=True)
    facebook = Column(String(length=512), nullable=True)
    whatsapp = Column(String(length=64), nullable=True)

    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="profiles")

    # Multiple cards per user
    label = Column(String(length=50), nullable=False, default="Main", server_default="Main")
    is_primary = Column(Boolean, nullable=False, default=False, server_default="false")
    # Optional per-card contact details (e.g. a work email); fall back to the account's
    contact_email = Column(String(length=255), nullable=True)
    contact_phone = Column(String(length=50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self):
        return f"<Profile {self.slug} ({self.display_name})>"


class Contact(Base):
    __tablename__ = "contacts"
    __table_args__ = (
        Index("ix_contacts_owner_profile", "owner_id", "target_profile_id"),
        # Fast lookup of open follow-up reminders (created in migration d2a7f5c3e9b1)
        Index(
            "ix_contacts_owner_follow_up", "owner_id", "follow_up_at",
            postgresql_where=text("follow_up_at IS NOT NULL AND NOT follow_up_done"),
            sqlite_where=text("follow_up_at IS NOT NULL AND NOT follow_up_done"),
        ),
    )

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # NULL for manual contacts (scanned paper cards, converted leads) with no SmartCard
    target_profile_id = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=True)

    # SNAPSHOT FIELDS
    saved_display_name = Column(String(255))
    saved_phone = Column(String(64))
    saved_email = Column(String(255))
    saved_company = Column(String(255))
    saved_job_title = Column(String(255))
    saved_whatsapp = Column(String(64))
    saved_website = Column(String(1024))
    saved_linkedin = Column(String(512))
    saved_facebook = Column(String(512))
    saved_twitter = Column(String(512))

    avatar_url = Column(String(1024))   # ✅ FOR NETWORK AVATAR
    bio = Column(Text)                  # ✅ SNAPSHOT BIO

    tag = Column(String(120))
    notes = Column(Text)
    source = Column(String(80))  # qr | nfc | manual | scan | lead
    saved_address = Column(String(500))

    # Where / when you met, and a follow-up reminder
    met_at = Column(String(255))  # event or place, e.g. "TechSummit Bengaluru"
    met_on = Column(Date)
    follow_up_at = Column(DateTime(timezone=True))
    follow_up_done = Column(Boolean, nullable=False, default=False, server_default="false")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    owner = relationship("User", foreign_keys=[owner_id])
    target_profile = relationship("Profile", foreign_keys=[target_profile_id])


    def __repr__(self):
        return f"<Contact {self.owner_id} -> {self.target_profile_id}>"

    """
    Represents a physical NFC tag or card that is mapped to a profile.
    encoded_url contains the public profile URL (or slug). We keep mapping in DB
    so tags can be reprogrammed to a different profile if needed.
    """
    
class NFCLink(Base):
    __tablename__ = "nfc_links"
    __table_args__ = (Index("ix_nfc_profile", "profile_id"),)

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uid = Column(String(length=255), nullable=True, unique=True)
    encoded_url = Column(String(length=1024), nullable=False)
    profile_id = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)

    active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    profile = relationship("Profile", foreign_keys=[profile_id])

    def __repr__(self):
        return f"<NFCLink {self.uid} -> {self.profile_id}>"


# A lightweight audit table to track profile updates / pushes (optional)
class ProfileAudit(Base):
    __tablename__ = "profile_audits"
    __table_args__ = (
        Index("ix_audit_profile", "profile_id"),
        Index("ix_audit_action", "action"),
    )

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(length=64), nullable=False)
    extra_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    profile = relationship("Profile", foreign_keys=[profile_id])

    def __repr__(self):
        return f"<ProfileAudit {self.profile_id} {self.action}>"


# -------------------- OTP model --------------------
class OTP(Base):
    __tablename__ = "otps"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identifier = Column(String(length=255), nullable=False, index=True)  # email or phone
    code = Column(String(length=6), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<OTP {self.identifier} {self.code} used={self.used}>"

# -------------------- User Settings model --------------------
class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id = Column(
    UUID(as_uuid=True),
    ForeignKey("users.id", ondelete="CASCADE"),
    primary_key=True,
    default=uuid.uuid4,
)

    # ACCOUNT
    public_profile = Column(Boolean, default=True)
    show_phone = Column(Boolean, default=True)
    show_email = Column(Boolean, default=False)

    # CARD & SHARING
    card_template = Column(String, default="pink")  # pink | dark | minimal
    default_share_type = Column(String, default="image")  # image | qr | link
    watermark_enabled = Column(Boolean, default=True)

    # QR & NFC
    nfc_enabled = Column(Boolean, default=True)

    # APP PREFS
    theme = Column(String, default="system")  # light | dark | system
    language = Column(String, default="en")
    

class ProfileCardSettings(Base):
    __tablename__ = "profile_card_settings"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    profile_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    # 🧱 TEMPLATE
    template = Column(String(50), nullable=True)          # classic | modern | minimal

    # 🎨 COLORS
    background_color = Column(String(50), nullable=True)  # hex
    text_color = Column(String(50), nullable=True)        # hex

    # 🖼 MEDIA
    background_image = Column(String(1024), nullable=True)
    logo = Column(String(1024), nullable=True)

    # 🧩 VISIBILITY CONTROL
    fields = Column(JSON, nullable=True)
    # example:
    # {
    #   "email": true,
    #   "phone": true,
    #   "company": true,
    #   "job_title": true
    # }

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
    profile = relationship("Profile", foreign_keys=[profile_id])
    def __repr__(self):
        return f"<ProfileCardSettings {self.profile_id}>"
    
# -------------------- End of models.py --------------------

# -------------------- Lead (two-way exchange) --------------------
class Lead(Base):
    """Details a visitor shared back from someone's public profile page."""
    __tablename__ = "leads"
    __table_args__ = (Index("ix_leads_profile_created", "profile_id", "created_at"),)

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(64), nullable=True)
    company = Column(String(255), nullable=True)
    note = Column(Text, nullable=True)
    source = Column(String(20), nullable=True)  # qr | nfc | link

    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    profile = relationship("Profile", foreign_keys=[profile_id])

    def __repr__(self):
        return f"<Lead {self.name} -> {self.profile_id}>"


# -------------------- Custom links on a profile --------------------
class ProfileLink(Base):
    __tablename__ = "profile_links"
    __table_args__ = (Index("ix_profile_links_profile_pos", "profile_id", "position"),)

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(80), nullable=False)
    url = Column(String(1024), nullable=False)
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# -------------------- Old slugs keep working after a rename --------------------
class SlugAlias(Base):
    __tablename__ = "slug_aliases"

    slug = Column(String(140), primary_key=True)
    profile_id = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)



# -------------------- Teams --------------------
class Team(Base):
    __tablename__ = "teams"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    owner_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan = Column(String(20), nullable=False, default="team", server_default="team")

    # Branding shown on every member's public card
    brand_company = Column(String(255), nullable=True)
    brand_logo_url = Column(String(1024), nullable=True)
    brand_color = Column(String(9), nullable=True)  # "#RRGGBB"

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "email", name="uq_team_members_team_email"),)

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(PG_UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    email = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="member")      # owner | admin | member
    status = Column(String(20), nullable=False, default="invited")   # invited | active
    invite_token_hash = Column(String(64), nullable=True, unique=True)
    invited_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    joined_at = Column(DateTime(timezone=True), nullable=True)

    team = relationship("Team", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])


# -------------------- Integrations --------------------
class Webhook(Base):
    """Outgoing webhooks (Zapier, Make, n8n, your own server)."""
    __tablename__ = "webhooks"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String(1024), nullable=False)
    secret = Column(String(64), nullable=False)
    events = Column(JSON, nullable=False)  # ["lead.created", "contact.saved"]
    active = Column(Boolean, nullable=False, default=True, server_default="true")
    last_status = Column(String(40), nullable=True)
    last_delivery_at = Column(DateTime(timezone=True), nullable=True)
    failure_count = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Integration(Base):
    """Connected CRMs (HubSpot). Tokens are stored encrypted."""
    __tablename__ = "integrations"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_integrations_user_provider"),)

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(30), nullable=False)
    access_token_enc = Column(Text, nullable=False)
    auto_sync = Column(Boolean, nullable=False, default=True, server_default="true")
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_count = Column(Integer, nullable=True)
    last_error = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
