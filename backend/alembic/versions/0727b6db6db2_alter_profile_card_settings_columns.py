"""alter profile_card_settings columns

Revision ID: xxxx
Revises: 7485a0afc6f3
Create Date: 2026-01-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "xxxx"
down_revision = "7485a0afc6f3"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    columns = [col["name"] for col in inspector.get_columns("profile_card_settings")]

    if "background_color" not in columns:
        op.add_column(
            "profile_card_settings",
            sa.Column("background_color", sa.String(length=50), nullable=True),
        )
        
def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    columns = [col["name"] for col in inspector.get_columns("profile_card_settings")]

    if "background_color" in columns:
        op.drop_column("profile_card_settings", "background_color")
