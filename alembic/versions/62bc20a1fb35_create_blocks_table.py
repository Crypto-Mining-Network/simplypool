"""create blocks table

Revision ID: 62bc20a1fb35
Revises: 
Create Date: 2018-04-06 17:56:48.133405

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '62bc20a1fb35'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'blocks',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('coin', sa.String(16), nullable=False),
        sa.Column('height', sa.Integer, nullable=True),
        sa.Column('hash', sa.String(64), nullable=True),
        sa.Column('reward', sa.Float, nullable=True),
        sa.Column('mined_at', sa.TIMESTAMP, nullable=True),
        sa.Column('is_valid', sa.Boolean, nullable=True),
        sa.Column('is_unlocked', sa.Boolean, nullable=False, default=False)
    )


def downgrade():
    op.drop_table('blocks')
