from typing import Protocol

from app.schemas import TriageResult


class TriageProvider(Protocol):
    name: str

    def triage(self, text: str, location: str) -> TriageResult: ...


class RetryableTriageError(Exception):
    pass
