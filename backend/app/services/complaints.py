import hashlib
import logging
import random
import time
from typing import Literal
from uuid import UUID

from prometheus_client import Counter, Histogram

from app.providers.cache import RedisCache
from app.providers.triage.base import RetryableTriageError, TriageProvider
from app.providers.triage.rules import RuleBasedTriage
from app.providers.triage.selector import ProviderSelector
from app.repositories.complaints import ComplaintRepository
from app.schemas import (
    Category,
    Complaint,
    ComplaintCreate,
    ComplaintPage,
    Priority,
    ProviderSelection,
    ProvidersMeta,
    Stats,
    Status,
    TriageResult,
)

TRIAGE_LATENCY = Histogram("civicpulse_triage_latency_seconds", "Triage duration")
FALLBACKS = Counter("civicpulse_triage_fallback_total", "Provider fallback count")
TRIAGE_CACHE = Counter("civicpulse_triage_cache_total", "Triage cache lookups", ["result"])
TRANSITIONS: dict[Status, frozenset[Status]] = {
    Status.open: frozenset({Status.in_progress, Status.rejected}),
    Status.in_progress: frozenset({Status.resolved, Status.rejected}),
    Status.resolved: frozenset(),
    Status.rejected: frozenset(),
}


class MissingComplaint(Exception):
    pass


class InvalidTransition(Exception):
    def __init__(self, before: Status, after: Status):
        self.before = before
        self.after = after
        super().__init__(f"Cannot change status from {before.value} to {after.value}.")


class RateLimited(Exception):
    def __init__(self, retry_after: int):
        self.retry_after = retry_after


class ComplaintService:
    def __init__(self, repository: ComplaintRepository, cache: RedisCache, provider: TriageProvider, rate_limit: int,
                 selector: ProviderSelector | None = None):
        self.repository = repository
        self.cache = cache
        self.provider = provider
        self.selector = selector
        self.rules = RuleBasedTriage()
        self.rate_limit = rate_limit

    def create(self, data: ComplaintCreate, reporter_id: str, client_ip: str, request_id: str) -> Complaint:
        retry_after = self.cache.check_rate(client_ip, self.rate_limit)
        if retry_after:
            raise RateLimited(retry_after)
        # Resolve once so an operator switch cannot change provider mid-request.
        provider = self.selector.current() if self.selector else self.provider
        model = getattr(provider, "model", "")
        key = hashlib.sha256(f"{provider.name}\0{model}\0{data.text.casefold()}\0{data.location.casefold()}".encode()).hexdigest()
        started = time.monotonic()
        error_class: str | None = None
        cached = self.cache.get_triage(key)
        if cached:
            result, provider_name = cached
            TRIAGE_CACHE.labels("hit").inc()
        else:
            TRIAGE_CACHE.labels("miss").inc()
            try:
                result = self._triage(data, provider)
                provider_name = provider.name
            except Exception as exc:  # noqa: BLE001 - every provider failure must fall back
                error_class = type(exc).__name__
                result = self.rules.triage(data.text, data.location)
                provider_name = "rules:fallback"
            if provider_name != "rules:fallback":
                self.cache.set_triage(key, result, provider_name)
        latency_ms = int((time.monotonic() - started) * 1000)
        TRIAGE_LATENCY.observe(latency_ms / 1000)
        complaint = self.repository.create(data, reporter_id, result, provider_name, latency_ms, error_class)
        self.cache.invalidate_stats()
        if error_class:
            FALLBACKS.inc()
            logging.getLogger("civicpulse").warning(
                "triage_fallback", extra={"request_id": request_id, "complaint_id": str(complaint.id),
                                           "provider": provider.name, "error_class": error_class},
            )
        return complaint

    def _triage(self, data: ComplaintCreate, provider: TriageProvider) -> TriageResult:
        for attempt in range(2):
            try:
                # A provider may violate its own typing contract; validate on every return.
                return TriageResult.model_validate(provider.triage(data.text, data.location))
            except RetryableTriageError:
                if attempt == 1:
                    raise
                time.sleep(random.uniform(0.05, 0.2))
        raise AssertionError("unreachable")

    def get(self, complaint_id: UUID) -> Complaint:
        complaint = self.repository.get(complaint_id)
        if complaint is None:
            raise MissingComplaint
        return complaint

    def list(self, category: Category | None, priority: Priority | None, status: Status | None, page: int, page_size: int) -> ComplaintPage:
        return self.repository.list(category, priority, status, page, page_size)

    def list_for_reporter(self, reporter_id: str, page: int, page_size: int) -> ComplaintPage:
        return self.repository.list_for_reporter(reporter_id, page, page_size)

    def get_for_reporter(self, complaint_id: UUID, reporter_id: str) -> Complaint:
        complaint = self.repository.get_for_reporter(complaint_id, reporter_id)
        if complaint is None:
            raise MissingComplaint
        return complaint

    def update_status(self, complaint_id: UUID, target: Status) -> Complaint:
        # Check the current status under the repository row lock.
        updated, previous = self.repository.update_status(complaint_id, target, TRANSITIONS)
        if previous is None:
            raise MissingComplaint
        if updated is None:
            raise InvalidTransition(previous, target)
        self.cache.invalidate_stats()
        return updated

    def stats(self) -> tuple[Stats, str]:
        cached, version = self.cache.get_stats()
        if cached is not None:
            return Stats.model_validate(cached), "HIT"
        stats = self.repository.stats()
        self.cache.set_stats(stats.model_dump(), version)
        return stats, "MISS"

    def providers(self) -> ProvidersMeta:
        if self.selector:
            return ProvidersMeta(
                active_provider=self.selector.current().name,
                selected_provider=self.selector.selected(),
                options=self.selector.options(),
                recent=self.repository.outcomes(),
            )
        selected: Literal["groq", "ollama", "rules", "simulated"] = "rules"
        if self.provider.name == "llm:groq":
            selected = "groq"
        elif self.provider.name == "llm:ollama":
            selected = "ollama"
        elif self.provider.name == "simulated":
            selected = "simulated"
        return ProvidersMeta(active_provider=self.provider.name, selected_provider=selected,
                             recent=self.repository.outcomes())

    def choose_provider(self, selection: ProviderSelection) -> ProvidersMeta:
        if not self.selector:
            raise RuntimeError("Provider switching is not configured")
        self.selector.choose(selection)
        return self.providers()
