"""add_auth_columns_to_users

Revision ID: c5c1598f9202
Revises: add_auth_columns
Create Date: 2025-05-15 17:05:20.034469

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5c1598f9202'
down_revision: Union[str, None] = 'add_auth_columns'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
