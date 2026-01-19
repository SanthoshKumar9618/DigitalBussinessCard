# backend/app/database/models.py
import uuid
from sqlalchemy import (
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

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    profile = relationship(
        "Profile",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User {self.email}>"



class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_profiles_slug"),
        Index("ix_profiles_user_id", "user_id"),
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
    user = relationship("User", back_populates="profile")

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
    )

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_profile_id = Column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)

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
    source = Column(String(80))  # qr | nfc | manual

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