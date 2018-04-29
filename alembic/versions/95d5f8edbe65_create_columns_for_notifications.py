"""create columns for notifications

Revision ID: 95d5f8edbe65
Revises: c70ef211a245
Create Date: 2018-04-21 11:01:15.356948

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '95d5f8edbe65'
down_revision = 'c70ef211a245'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('workers', sa.Column('notified_down_at', sa.TIMESTAMP, default=None))
    op.add_column('workers', sa.Column('notified_up_at', sa.TIMESTAMP, default=None))
    op.add_column('workers', sa.Column('first_session_share_at', sa.TIMESTAMP, default=None))
    op.add_column('users', sa.Column('telegram', sa.String(512)))



def downgrade():
    op.drop_column('workers', 'notified_down_at')
    op.drop_column('workers', 'notified_up_at')
    op.drop_column('workers', 'first_session_share_at')
    op.drop_column('users', 'telegram')
