"""Add auth columns to users table

Revision ID: add_auth_columns
Revises: a8803e57be54
Create Date: 2025-05-15 17:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_auth_columns'
down_revision: Union[str, None] = 'a8803e57be54'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing authentication columns to the users table"""
    # Add columns that are missing from the schema
    op.add_column('users', sa.Column('verification_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('verification_token_expires', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('password_reset_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('password_reset_expires', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=True))
    op.add_column('users', sa.Column('lock_until', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('role', sa.String(), server_default='user', nullable=True))
    op.add_column('users', sa.Column('last_token_refresh', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('updated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove the added authentication columns"""
    op.drop_column('users', 'verification_token')
    op.drop_column('users', 'verification_token_expires')
    op.drop_column('users', 'password_reset_token')
    op.drop_column('users', 'password_reset_expires')
    op.drop_column('users', 'failed_login_attempts')
    op.drop_column('users', 'lock_until')
    op.drop_column('users', 'role')
    op.drop_column('users', 'last_token_refresh')
    op.drop_column('users', 'updated_at')
