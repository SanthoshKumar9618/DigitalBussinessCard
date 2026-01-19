"""merge multiple heads

Revision ID: 18444c40e50d
Revises: 20251215_add_perf_indexes, 34c6b4ca851f
Create Date: 2026-01-08 13:18:01.115968

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '18444c40e50d'
down_revision: Union[str, None] = ('20251215_add_perf_indexes', '34c6b4ca851f')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
