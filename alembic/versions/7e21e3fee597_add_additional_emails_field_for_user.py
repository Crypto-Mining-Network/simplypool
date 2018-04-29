"""add additional_emails field for user

Revision ID: 7e21e3fee597
Revises: 95d5f8edbe65
Create Date: 2018-04-24 14:31:02.826797

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7e21e3fee597'
down_revision = '95d5f8edbe65'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('additional_emails', sa.String(2048)))


def downgrade():
    op.drop_column('users', 'additional_emails')
