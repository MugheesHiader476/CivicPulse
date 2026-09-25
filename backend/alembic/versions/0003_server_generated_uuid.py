"""Let PostgreSQL generate complaint UUIDs for inserts outside the ORM.

Revision ID: 0003
Revises: 0002
"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE complaints ALTER COLUMN id SET DEFAULT gen_random_uuid()")


def downgrade():
    op.execute("ALTER TABLE complaints ALTER COLUMN id DROP DEFAULT")
