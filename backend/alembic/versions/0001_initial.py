"""Create complaints and triage outcomes.

Revision ID: 0001
Revises:
"""
import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "complaints",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("location", sa.String(200), nullable=False),
        sa.Column("reporter_contact", sa.String(200)),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("priority", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("ai_summary", sa.String(140)),
        sa.Column("triaged_by", sa.String(32), nullable=False),
        sa.Column("triage_latency_ms", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("length(text) BETWEEN 10 AND 2000", name="ck_complaints_text_length"),
        sa.CheckConstraint("length(location) BETWEEN 3 AND 200", name="ck_complaints_location_length"),
        sa.CheckConstraint("reporter_contact IS NULL OR length(reporter_contact) <= 200", name="ck_complaints_contact_length"),
        sa.CheckConstraint("ai_summary IS NULL OR length(ai_summary) <= 140", name="ck_complaints_summary_length"),
        sa.CheckConstraint("triage_latency_ms IS NULL OR triage_latency_ms >= 0", name="ck_complaints_latency"),
        sa.CheckConstraint("category IN ('water','electricity','sanitation','roads','streetlights','other')", name="ck_complaints_category"),
        sa.CheckConstraint("priority IN ('high','normal','low')", name="ck_complaints_priority"),
        sa.CheckConstraint("status IN ('open','in_progress','resolved','rejected')", name="ck_complaints_status"),
    )
    op.create_index("ix_complaints_status_priority", "complaints", ["status", "priority"])
    op.create_index("ix_complaints_created_at", "complaints", ["created_at"])
    op.create_table(
        "triage_outcomes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("complaint_id", sa.String(36), sa.ForeignKey("complaints.id", ondelete="CASCADE")),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("fallback", sa.Boolean(), nullable=False),
        sa.Column("error_class", sa.String(80)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("triage_outcomes")
    op.drop_index("ix_complaints_created_at", table_name="complaints")
    op.drop_index("ix_complaints_status_priority", table_name="complaints")
    op.drop_table("complaints")
