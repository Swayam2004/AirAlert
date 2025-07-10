"""Add station_id column to weather_data table

Revision ID: add_station_id_to_weather_data
Revises: # Leave this empty for now
Create Date: 2025-05-15 05:06:00.000000

"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2

# revision identifiers, used by Alembic.
revision = 'add_station_id_to_weather'
down_revision = None  # Update this with the ID of your last migration
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Use batch operations for SQLite
    with op.batch_alter_table('weather_data') as batch_op:
        batch_op.add_column(sa.Column('station_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_weather_data_station_id',
            'monitoring_stations',
            ['station_id'], ['id']
        )

def downgrade() -> None:
    # Use batch operations for SQLite
    with op.batch_alter_table('weather_data') as batch_op:
        batch_op.drop_constraint('fk_weather_data_station_id', type_='foreignkey')
        batch_op.drop_column('station_id')
