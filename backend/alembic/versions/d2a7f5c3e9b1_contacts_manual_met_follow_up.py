"""contacts: manual contacts, where/when met, follow-up reminders

Revision ID: d2a7f5c3e9b1
Revises: c4d8e1a6b9f2
Create Date: 2026-11-24 18:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d2a7f5c3e9b1"
down_revision: Union[str, None] = "c4d8e1a6b9f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("contacts", "target_profile_id", existing_type=sa.UUID(), nullable=True)
    op.add_column("contacts", sa.Column("saved_address", sa.String(length=500), nullable=True))
    op.add_column("contacts", sa.Column("met_at", sa.String(length=255), nullable=True))
    op.add_column("contacts", sa.Column("met_on", sa.Date(), nullable=True))
    op.add_column("contacts", sa.Column("follow_up_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("contacts", sa.Column("follow_up_done", sa.Boolean(), nullable=False, server_default=sa.false()))
    # Existing contacts: "met on" = the day they were saved
    op.execute("UPDATE contacts SET met_on = created_at::date WHERE met_on IS NULL")
    op.create_index(
        "ix_contacts_owner_follow_up", "contacts", ["owner_id", "follow_up_at"],
        postgresql_where=sa.text("follow_up_at IS NOT NULL AND NOT follow_up_done"),
    )


def downgrade() -> None:
    op.drop_index("ix_contacts_owner_follow_up", table_name="contacts")
    op.drop_column("contacts", "follow_up_done")
    op.drop_column("contacts", "follow_up_at")
    op.drop_column("contacts", "met_on")
    op.drop_column("contacts", "met_at")
    op.drop_column("contacts", "saved_address")
    # Manual contacts have no profile; they must go before restoring NOT NULL.
    op.execute("DELETE FROM contacts WHERE target_profile_id IS NULL")
    op.alter_column("contacts", "target_profile_id", existing_type=sa.UUID(), nullable=False)
