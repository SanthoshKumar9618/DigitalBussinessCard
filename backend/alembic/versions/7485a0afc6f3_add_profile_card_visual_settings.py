"""add profile card visual settings

Revision ID: 7485a0afc6f3
Revises: 18444c40e50d
Create Date: 2026-01-xx xx:xx:xx
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "7485a0afc6f3"
down_revision = "18444c40e50d"
branch_labels = None
depends_on = None


def upgrade():
    # ⚠️ IMPORTANT:
    # Table already exists in DB (created manually / earlier)
    # So we DO NOT create it again here.
    # This migration is only to SYNC Alembic history.

    pass


def downgrade():
    # ⚠️ We DO NOT drop the table in downgrade
    # because it is a core feature and already live.

    pass
