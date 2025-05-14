"""merge heads

Revision ID: cba801223e8a
Revises: a8803e57be54, add_station_id_to_weather
Create Date: 2025-05-15 05:19:00.186921

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cba801223e8a'
down_revision: Union[str, None] = ('a8803e57be54', 'add_station_id_to_weather')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
