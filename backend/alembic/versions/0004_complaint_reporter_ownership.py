"""Associate each newly submitted complaint with its Clerk reporter.

Revision ID: 0004
Revises: 0003
"""
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("complaints", sa.Column("reporter_id", sa.String(length=128), nullable=True))
    op.create_index("ix_complaints_reporter_id_created_at", "complaints", ["reporter_id", "created_at"])


def downgrade():
    op.drop_index("ix_complaints_reporter_id_created_at", table_name="complaints")
    op.drop_column("complaints", "reporter_id")
