"""create hash_history table

Revision ID: d962441fef39
Revises: 640c1e48630e
Create Date: 2018-04-08 21:21:45.908127

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd962441fef39'
down_revision = '640c1e48630e'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'hash_history',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('at', sa.TIMESTAMP, nullable=False),
        sa.Column('granularity', sa.String(8), nullable=False),
        sa.Column('coin', sa.String(16), nullable=False),
        sa.Column('wallet', sa.String(128), nullable=False),
        sa.Column('worker', sa.String(32), nullable=True),
        sa.Column('hashes', sa.BIGINT, nullable=False)
    )
    op.create_unique_constraint('uq_hash_history', 'hash_history', ['at', 'granularity', 'coin', 'wallet', 'worker'], )


def downgrade():
    op.drop_constraint('uq_hash_history', 'hash_history')
    op.drop_table('hash_history')
