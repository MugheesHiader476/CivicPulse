from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session, sessionmaker

from app.repositories.models import ComplaintRow, TriageOutcomeRow, utc_now
from app.schemas import (
    Category,
    Complaint,
    ComplaintCreate,
    ComplaintPage,
    Priority,
    Stats,
    Status,
    TriageOutcome,
    TriageResult,
)


class ComplaintRepository:
    def __init__(self, sessions: sessionmaker[Session]):
        self.sessions = sessions

    def create(self, data: ComplaintCreate, triage: TriageResult, provider: str, latency_ms: int, error_class: str | None) -> Complaint:
        with self.sessions.begin() as session:
            row = ComplaintRow(
                text=data.text, location=data.location, reporter_contact=data.reporter_contact,
                category=triage.category.value, priority=triage.priority.value,
                status=Status.open.value, ai_summary=triage.summary, triaged_by=provider,
                triage_latency_ms=latency_ms,
            )
            session.add(row)
            session.flush()
            session.add(TriageOutcomeRow(
                complaint_id=row.id, provider=provider, latency_ms=latency_ms,
                fallback=provider == "rules:fallback", error_class=error_class,
            ))
            result = Complaint.model_validate(row)
        return result

    def get(self, complaint_id: UUID) -> Complaint | None:
        with self.sessions() as session:
            row = session.get(ComplaintRow, complaint_id)
            return Complaint.model_validate(row) if row else None

    def list(self, category: Category | None, priority: Priority | None, status: Status | None, page: int, page_size: int) -> ComplaintPage:
        with self.sessions() as session:
            query = select(ComplaintRow)
            if category is not None:
                query = query.where(ComplaintRow.category == category.value)
            if priority is not None:
                query = query.where(ComplaintRow.priority == priority.value)
            if status is not None:
                query = query.where(ComplaintRow.status == status.value)
            total = session.scalar(select(func.count()).select_from(query.subquery())) or 0
            rows = session.scalars(query.order_by(ComplaintRow.created_at.desc(), ComplaintRow.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
            return ComplaintPage(items=[Complaint.model_validate(row) for row in rows], total=total, page=page, page_size=page_size)

    def update_status(self, complaint_id: UUID, target: Status, transitions: dict[Status, frozenset[Status]]) -> tuple[Complaint | None, Status | None]:
        with self.sessions.begin() as session:
            row = session.get(ComplaintRow, complaint_id, with_for_update=True)
            if row is None:
                return None, None
            previous = Status(row.status)
            if target not in transitions[previous]:
                return None, previous
            row.status = target.value
            row.updated_at = utc_now()
            session.flush()
            return Complaint.model_validate(row), previous

    def stats(self) -> Stats:
        with self.sessions() as session:
            def grouped(column):
                return {str(key): count for key, count in session.execute(select(column, func.count()).group_by(column)).all()}
            return Stats(
                total=session.scalar(select(func.count()).select_from(ComplaintRow)) or 0,
                by_category=grouped(ComplaintRow.category),
                by_priority=grouped(ComplaintRow.priority),
                by_status=grouped(ComplaintRow.status),
            )

    def outcomes(self) -> list[TriageOutcome]:
        with self.sessions() as session:
            rows = session.scalars(select(TriageOutcomeRow).order_by(TriageOutcomeRow.id.desc()).limit(20)).all()
            return [TriageOutcome.model_validate(row) for row in rows]

    def ping(self) -> None:
        with self.sessions() as session:
            session.execute(text("SELECT 1"))
