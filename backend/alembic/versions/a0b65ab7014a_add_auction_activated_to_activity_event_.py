"""Add auction_activated to activity_event_type enum

Revision ID: a0b65ab7014a
Revises: 97ac170447b6
Create Date: 2026-04-26 12:25:58.493786

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0b65ab7014a'
down_revision: Union[str, Sequence[str], None] = '97ac170447b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enums are not automatically updated by alembic autogenerate
    op.execute("ALTER TYPE activity_event_type ADD VALUE 'auction_activated'")


def downgrade() -> None:
    """Downgrade schema."""
    # PostgreSQL does not support removing a value from an enum type easily.
    pass
