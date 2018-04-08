"""create round_shares table

Revision ID: d3041c1b2b35
Revises: 62bc20a1fb35
Create Date: 2018-04-06 18:48:09.046048

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd3041c1b2b35'
down_revision = '62bc20a1fb35'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'round_shares',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('block_id', sa.Integer, nullable=False),
        sa.Column('wallet', sa.String(128), nullable=False),
        sa.Column('shares', sa.Integer, nullable=False, default=0)
    )
    op.create_unique_constraint('uq_round_shares', 'round_shares', ['block_id', 'wallet'],)


def downgrade():
    op.drop_constraint('uq_round_shares', 'round_shares')
    op.drop_table('round_shares')
