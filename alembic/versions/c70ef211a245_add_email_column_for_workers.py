"""add email column for workers

Revision ID: c70ef211a245
Revises: c364450a1076
Create Date: 2018-04-18 22:57:44.792557

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.

revision = 'c70ef211a245'
down_revision = 'c364450a1076'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('workers', sa.Column('email', sa.String(128)))


def downgrade():
    op.drop_column('workers', 'email')
