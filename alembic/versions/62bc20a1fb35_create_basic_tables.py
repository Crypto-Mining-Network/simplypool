"""create basic tables

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
        sa.Column('hash', sa.String(512), nullable=True),
        sa.Column('reward', sa.Float, nullable=True),
        sa.Column('mined_at', sa.TIMESTAMP, nullable=True),
        sa.Column('is_valid', sa.Boolean, nullable=True),
        sa.Column('is_unlocked', sa.Boolean, nullable=False, default=False)
    )
    op.create_table(
        'rewards',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('coin', sa.String(16), nullable=False),
        sa.Column('block_id', sa.Integer, nullable=False),
        sa.Column('wallet', sa.String(128), nullable=False),
        sa.Column('reward', sa.Float, nullable=False)
    )
    op.create_table(
        'round_shares',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('block_id', sa.Integer, nullable=False),
        sa.Column('wallet', sa.String(128), nullable=False),
        sa.Column('shares', sa.BIGINT, nullable=False, default=0)
    )
    op.create_unique_constraint('uq_round_shares', 'round_shares', ['block_id', 'wallet'], )
    op.create_table(
        'workers_history',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('at', sa.TIMESTAMP, nullable=False),
        sa.Column('granularity', sa.String(8), nullable=False),
        sa.Column('coin', sa.String(16), nullable=True),
        sa.Column('wallet', sa.String(128), nullable=True),
        sa.Column('worker', sa.String(32), nullable=True),
        sa.Column('valid_hashes', sa.BIGINT, nullable=False),
        sa.Column('invalid_hashes', sa.BIGINT, nullable=False)
    )
    op.create_unique_constraint('uq_workers_history', 'workers_history', ['at', 'granularity', 'coin', 'wallet', 'worker'], )
    op.create_table(
        'workers',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('coin', sa.String(16), nullable=True),
        sa.Column('wallet', sa.String(128), nullable=True),
        sa.Column('worker', sa.String(32), nullable=True),
        sa.Column('last_share', sa.TIMESTAMP, nullable=True),
        sa.Column('first_share', sa.TIMESTAMP, nullable=False),
        sa.Column('downtime', sa.Integer, nullable=False),
        sa.Column('uptime', sa.Integer, nullable=False),
        sa.Column('valid_hashes', sa.Integer, nullable=False),
        sa.Column('invalid_hashes', sa.Integer, nullable=False)
    )
    op.create_unique_constraint('uq_workers', 'workers', ['coin', 'wallet', 'worker'], )
    op.create_table(
        'nodes',
        sa.Column('coin', sa.String(16), primary_key=True),
        sa.Column('height', sa.Integer, nullable=True),
        sa.Column('difficulty', sa.BIGINT, nullable=True),
        sa.Column('polled_at', sa.TIMESTAMP, nullable=True)
    )


def downgrade():
    op.drop_table('blocks')
    op.drop_table('rewards')
    op.drop_constraint('uq_round_shares', 'round_shares')
    op.drop_table('round_shares')
    op.drop_constraint('uq_workers_history', 'workers_history')
    op.drop_table('workers_history')
    op.drop_constraint('uq_workers', 'workers')
    op.drop_table('workers')
    op.drop_table('nodes')
