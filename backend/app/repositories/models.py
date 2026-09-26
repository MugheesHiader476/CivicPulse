from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class ComplaintRow(Base):
    __tablename__ = "complaints"
    __table_args__ = (
        CheckConstraint("length(text) BETWEEN 10 AND 2000", name="ck_complaints_text_length"),
        CheckConstraint("length(location) BETWEEN 3 AND 200", name="ck_complaints_location_length"),
        CheckConstraint("reporter_contact IS NULL OR length(reporter_contact) <= 200", name="ck_complaints_contact_length"),
        CheckConstraint("ai_summary IS NULL OR length(ai_summary) <= 140", name="ck_complaints_summary_length"),
        CheckConstraint("triage_latency_ms IS NULL OR triage_latency_ms >= 0", name="ck_complaints_latency"),
        CheckConstraint("category IN ('water','electricity','sanitation','roads','streetlights','other')", name="ck_complaints_category"),
        CheckConstraint("priority IN ('high','normal','low')", name="ck_complaints_priority"),
        CheckConstraint("status IN ('open','in_progress','resolved','rejected')", name="ck_complaints_status"),
        Index("ix_complaints_status_priority", "status", "priority"),
        Index("ix_complaints_created_at", "created_at"),
        Index("ix_complaints_reporter_id_created_at", "reporter_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    reporter_contact: Mapped[str | None] = mapped_column(String(200))
    reporter_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    priority: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    ai_summary: Mapped[str | None] = mapped_column(String(140))
    triaged_by: Mapped[str] = mapped_column(String(32), nullable=False)
    triage_latency_ms: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class TriageOutcomeRow(Base):
    __tablename__ = "triage_outcomes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    complaint_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"))
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    fallback: Mapped[bool] = mapped_column(nullable=False)
    error_class: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
