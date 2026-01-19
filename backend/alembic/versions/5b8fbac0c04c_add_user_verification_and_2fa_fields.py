"""add user verification and 2fa fields

Revision ID: 5b8fbac0c04c
Revises: xxxx
Create Date: 2026-01-09 11:37:53.779613

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5b8fbac0c04c'
down_revision: Union[str, None] = 'xxxx'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # --- USER VERIFICATION FIELDS ---
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), server_default=sa.false()))
    op.add_column('users', sa.Column('phone_verified', sa.Boolean(), server_default=sa.false()))
    op.add_column('users', sa.Column('email_otp', sa.String(length=6), nullable=True))
    op.add_column('users', sa.Column('phone_otp', sa.String(length=6), nullable=True))
    op.add_column('users', sa.Column('otp_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean(), server_default=sa.false()))
    op.add_column('users', sa.Column('two_factor_secret', sa.String(length=255), nullable=True))
    op.drop_column('users', 'is_verified')

    # --- SAFE JSON CAST ---
    op.execute(
        """
        ALTER TABLE profile_audits
        ALTER COLUMN extra_metadata
        TYPE JSON
        USING extra_metadata::json
        """
    )

def downgrade():
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), default=False))
    op.drop_column('users', 'two_factor_secret')
    op.drop_column('users', 'two_factor_enabled')
    op.drop_column('users', 'otp_expires_at')
    op.drop_column('users', 'phone_otp')
    op.drop_column('users', 'email_otp')
    op.drop_column('users', 'phone_verified')
    op.drop_column('users', 'email_verified')

    op.execute(
        """
        ALTER TABLE profile_audits
        ALTER COLUMN extra_metadata
        TYPE TEXT
        """
    )
