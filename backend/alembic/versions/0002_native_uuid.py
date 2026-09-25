"""Store complaint identifiers as native PostgreSQL UUIDs.

Revision ID: 0002
Revises: 0001
"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("triage_outcomes_complaint_id_fkey", "triage_outcomes", type_="foreignkey")
    op.alter_column("complaints", "id", existing_type=sa.String(36), type_=sa.Uuid(as_uuid=True),
                    postgresql_using="id::uuid")
    op.alter_column("triage_outcomes", "complaint_id", existing_type=sa.String(36), type_=sa.Uuid(as_uuid=True),
                    postgresql_using="complaint_id::uuid")
    op.create_foreign_key("triage_outcomes_complaint_id_fkey", "triage_outcomes", "complaints",
                          ["complaint_id"], ["id"], ondelete="CASCADE")


def downgrade():
    op.drop_constraint("triage_outcomes_complaint_id_fkey", "triage_outcomes", type_="foreignkey")
    op.alter_column("triage_outcomes", "complaint_id", existing_type=sa.Uuid(as_uuid=True), type_=sa.String(36),
                    postgresql_using="complaint_id::text")
    op.alter_column("complaints", "id", existing_type=sa.Uuid(as_uuid=True), type_=sa.String(36),
                    postgresql_using="id::text")
    op.create_foreign_key("triage_outcomes_complaint_id_fkey", "triage_outcomes", "complaints",
                          ["complaint_id"], ["id"], ondelete="CASCADE")
