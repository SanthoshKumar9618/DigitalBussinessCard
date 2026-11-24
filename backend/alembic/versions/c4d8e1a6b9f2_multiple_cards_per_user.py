"""multiple cards per user: label, is_primary, per-card contact details

Revision ID: c4d8e1a6b9f2
Revises: b7e2d4f1c8a3
Create Date: 2026-11-24 15:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c4d8e1a6b9f2"
down_revision: Union[str, None] = "b7e2d4f1c8a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("label", sa.String(length=50), nullable=False, server_default="Main"))
    op.add_column("profiles", sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("profiles", sa.Column("contact_email", sa.String(length=255), nullable=True))
    op.add_column("profiles", sa.Column("contact_phone", sa.String(length=50), nullable=True))

    # Every existing user's oldest card becomes their primary card.
    op.execute(
        """
        UPDATE profiles SET is_primary = true
        WHERE id IN (
            SELECT DISTINCT ON (user_id) id FROM profiles ORDER BY user_id, created_at, id
        )
        """
    )
    # At most one primary card per user, enforced by the database.
    op.create_index(
        "uq_profiles_one_primary_per_user", "profiles", ["user_id"],
        unique=True, postgresql_where=sa.text("is_primary"),
    )


def downgrade() -> None:
    op.drop_index("uq_profiles_one_primary_per_user", table_name="profiles")
    op.drop_column("profiles", "contact_phone")
    op.drop_column("profiles", "contact_email")
    op.drop_column("profiles", "is_primary")
    op.drop_column("profiles", "label")
