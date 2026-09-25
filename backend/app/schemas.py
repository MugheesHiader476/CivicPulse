from datetime import datetime, timezone
from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Category(StrEnum):
    water = "water"
    electricity = "electricity"
    sanitation = "sanitation"
    roads = "roads"
    streetlights = "streetlights"
    other = "other"


class Priority(StrEnum):
    high = "high"
    normal = "normal"
    low = "low"


class Status(StrEnum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    rejected = "rejected"


class ComplaintCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=10, max_length=2000)
    location: str = Field(min_length=3, max_length=200)
    reporter_contact: str | None = Field(default=None, max_length=200)

    @field_validator("text", "location", "reporter_contact", mode="before")
    @classmethod
    def clean(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        value = value.strip()
        if any(ord(char) < 32 and char not in "\n\t" for char in value):
            raise ValueError("Control characters are not allowed")
        return value

    @field_validator("location", "reporter_contact")
    @classmethod
    def single_line(cls, value: str | None) -> str | None:
        if value is not None and ("\n" in value or "\r" in value):
            raise ValueError("Must be a single line")
        return value


class StatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Status


class TriageResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: Category
    priority: Priority
    summary: str = Field(min_length=1, max_length=140)
    confidence: float = Field(ge=0.0, le=1.0)

    @field_validator("summary")
    @classmethod
    def single_line(cls, value: str) -> str:
        if "\n" in value or "\r" in value:
            raise ValueError("Summary must be one line")
        return value


class Complaint(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    text: str
    location: str
    reporter_contact: str | None
    category: Category
    priority: Priority
    status: Status
    ai_summary: str | None
    triaged_by: str
    triage_latency_ms: int | None
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def utc_datetime(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


class ComplaintPage(BaseModel):
    items: list[Complaint]
    total: int
    page: int
    page_size: int


class Stats(BaseModel):
    total: int
    by_category: dict[str, int]
    by_priority: dict[str, int]
    by_status: dict[str, int]


class TriageOutcome(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    complaint_id: UUID | None
    provider: str
    latency_ms: int
    fallback: bool
    error_class: str | None = None
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def utc_datetime(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


class ProviderOption(BaseModel):
    id: Literal["groq", "ollama"]
    label: str
    model: str
    location: Literal["hosted", "local"]
    available: bool
    reason: str | None = None


class ProviderSelection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    provider: Literal["groq", "ollama"]


class ProvidersMeta(BaseModel):
    active_provider: str
    selected_provider: Literal["groq", "ollama", "rules", "simulated"] = "rules"
    options: list[ProviderOption] = Field(default_factory=list)
    recent: list[TriageOutcome]


class CurrentUser(BaseModel):
    role: Literal["citizen", "operator"]


class FieldError(BaseModel):
    field: str
    message: str


class ValidationErrorResponse(BaseModel):
    detail: str
    errors: list[FieldError]


class ErrorResponse(BaseModel):
    detail: str


class Health(BaseModel):
    status: str


class Readiness(BaseModel):
    status: str
    checks: dict[str, str]
