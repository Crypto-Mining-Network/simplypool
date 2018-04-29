"""create telegram_subscriptions table

Revision ID: 0dea2e5b7be0
Revises: 7e21e3fee597
Create Date: 2018-04-24 20:19:10.148292

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0dea2e5b7be0'
down_revision = '7e21e3fee597'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'telegram_subscriptions',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('email', sa.String(128), nullable=False),
        sa.Column('chat_id', sa.Integer, nullable=False)
    )
    op.create_unique_constraint('uq_telegram_subscriptions', 'telegram_subscriptions', ['email', 'chat_id'], )


def downgrade():
    op.drop_constraint('uq_telegram_subscriptions', 'telegram_subscriptions')
    op.drop_table('telegram_subscriptions')
