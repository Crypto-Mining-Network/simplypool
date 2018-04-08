"""create rewards table

Revision ID: 640c1e48630e
Revises: d3041c1b2b35
Create Date: 2018-04-08 19:18:17.936220

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '640c1e48630e'
down_revision = 'd3041c1b2b35'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'rewards',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('coin', sa.String(16), nullable=False),
        sa.Column('block_id', sa.Integer, nullable=False),
        sa.Column('wallet', sa.String(128), nullable=False),
        sa.Column('reward', sa.Float, nullable=False)
    )


def downgrade():
    op.drop_table('rewards')
