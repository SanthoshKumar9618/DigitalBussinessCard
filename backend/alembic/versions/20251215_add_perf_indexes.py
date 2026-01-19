"""Add performance indexes for high traffic usage.

Indexes cover common filters/orderings:
- contacts: owner_id + created_at for list pagination
- profiles: user_id + created_at for quick lookup and ordering
- otps: identifier + used to speed up validation
- nfc_links: profile_id + active to resolve mappings quickly
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251215_add_perf_indexes"
down_revision = "d150f1bb13d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_contacts_owner_created",
        "contacts",
        ["owner_id", sa.text("created_at DESC")],
        unique=False,
    )
    op.create_index(
        "ix_profiles_user_created",
        "profiles",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_otps_identifier_used",
        "otps",
        ["identifier", "used"],
        unique=False,
    )
    op.create_index(
        "ix_nfc_links_profile_active",
        "nfc_links",
        ["profile_id", "active"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_nfc_links_profile_active", table_name="nfc_links")
    op.drop_index("ix_otps_identifier_used", table_name="otps")
    op.drop_index("ix_profiles_user_created", table_name="profiles")
    op.drop_index("ix_contacts_owner_created", table_name="contacts")

