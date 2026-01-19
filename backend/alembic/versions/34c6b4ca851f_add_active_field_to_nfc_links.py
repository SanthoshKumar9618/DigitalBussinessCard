"""Add active field to nfc_links

Revision ID: 34c6b4ca851f
Revises: 4bca1e067023
Create Date: 2025-12-10 15:11:45.477347

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34c6b4ca851f'
down_revision: Union[str, None] = '4bca1e067023'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
