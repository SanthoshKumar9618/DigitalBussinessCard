"""add profile_links and slug_aliases

Revision ID: b7e2d4f1c8a3
Revises: a1f3c9d2e7b4
Create Date: 2026-11-24 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b7e2d4f1c8a3"
down_revision: Union[str, None] = "a1f3c9d2e7b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "profile_links",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("profile_id", sa.UUID(), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_profile_links_profile_pos", "profile_links", ["profile_id", "position"])

    op.create_table(
        "slug_aliases",
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("profile_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("slug"),
    )
    op.create_index("ix_slug_aliases_profile_id", "slug_aliases", ["profile_id"])


def downgrade() -> None:
    op.drop_index("ix_slug_aliases_profile_id", table_name="slug_aliases")
    op.drop_table("slug_aliases")
    op.drop_index("ix_profile_links_profile_pos", table_name="profile_links")
    op.drop_table("profile_links")
