"""create users table

Revision ID: c364450a1076
Revises: 62bc20a1fb35
Create Date: 2018-04-18 17:27:13.654327

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c364450a1076'
down_revision = '62bc20a1fb35'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('email', sa.String(128), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(128), nullable=False),
        sa.Column('is_activated', sa.Boolean, default=False),
        sa.Column('activate_code', sa.String(128), nullable=False)
    )


def downgrade():
    op.drop_table('users')
