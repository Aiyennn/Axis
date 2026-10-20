"""Ingestion contracts for Axis adapters and the common task format.

These are Axis-owned adapter outputs, not vendor API response definitions.
Adapters map vendor fields into these contracts before task extraction. Unknown
facts stay None. Rankings, scores and generated explanations are downstream outputs.
"""

from datetime import date
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, HttpUrl, model_validator

from Backend.models.schemas import ImportanceLevel


class IngestionModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SourceRecord(IngestionModel):
    sourceId: str = Field(min_length=1)
    accountId: str = Field(min_length=1)
    sourceUrl: HttpUrl | None = None
    updatedAt: AwareDatetime | None = None
    fetchedAt: AwareDatetime


class GmailRecord(SourceRecord):
    integration: Literal["gmail"] = "gmail"
    threadId: str
    subject: str
    sender: str
    recipients: list[str] = Field(default_factory=list)
    receivedAt: AwareDatetime
    bodyText: str


class NotionRecord(SourceRecord):
    integration: Literal["notion"] = "notion"
    title: str
    bodyText: str = ""
    # Property names vary by workspace; the adapter maps configured properties.
    statusText: str | None = None
    dueAt: AwareDatetime | None = None
    dueDate: date | None = None
    assignees: list[str] = Field(default_factory=list)
    properties: dict[str, object] = Field(default_factory=dict)


class GitHubRecord(SourceRecord):
    integration: Literal["github"] = "github"
    repository: str
    number: int = Field(gt=0)
    kind: Literal["issue", "pull_request"]
    title: str
    bodyText: str = ""
    state: Literal["open", "closed"]
    merged: bool = False
    labels: list[str] = Field(default_factory=list)
    assignees: list[str] = Field(default_factory=list)
    milestoneDueAt: AwareDatetime | None = None


class CanvasRecord(SourceRecord):
    integration: Literal["canvas"] = "canvas"
    courseId: str
    courseName: str
    title: str
    descriptionText: str = ""
    dueAt: AwareDatetime | None = None
    pointsPossible: float | None = Field(default=None, ge=0)
    submissionStatus: str | None = None
    submittedAt: AwareDatetime | None = None
    # Keep submission information separate from Axis task completion.


class GoogleCalendarRecord(SourceRecord):
    integration: Literal["google_calendar"] = "google_calendar"
    calendarId: str
    title: str
    descriptionText: str = ""
    startAt: AwareDatetime | None = None
    endAt: AwareDatetime | None = None
    startDate: date | None = None
    endDate: date | None = None  # Exclusive for all-day events.
    timezone: str | None = None
    status: Literal["confirmed", "tentative", "cancelled"] = "confirmed"
    blocksTime: bool = True
    recurringEventId: str | None = None

    @model_validator(mode="after")
    def validate_interval(self):
        timed = self.startAt is not None and self.endAt is not None
        all_day = self.startDate is not None and self.endDate is not None
        if timed and self.startDate is None and self.endDate is None:
            if self.endAt <= self.startAt:
                raise ValueError("endAt must be after startAt")
        elif all_day and self.startAt is None and self.endAt is None:
            if self.endDate <= self.startDate:
                raise ValueError("endDate must be after startDate")
        else:
            raise ValueError("Provide either a timed interval or an all-day date interval")
        return self


class ManualTaskRecord(SourceRecord):
    integration: Literal["manual"] = "manual"
    title: str = Field(min_length=1)
    description: str = ""
    deadlineAt: AwareDatetime | None = None
    deadlineDate: date | None = None
    isHardDeadline: bool | None = None
    estimatedHours: float | None = Field(default=None, gt=0)
    importance: ImportanceLevel | None = None
    consequencesOfDelay: str | None = None


IntegrationRecord = Annotated[
    GmailRecord | NotionRecord | GitHubRecord | CanvasRecord
    | GoogleCalendarRecord | ManualTaskRecord,
    Field(discriminator="integration"),
]


class FieldEvidence(IngestionModel):
    field: Literal[
        "title", "description", "deadlineAt", "deadlineDate", "isHardDeadline",
        "estimatedHours", "importance", "consequencesOfDelay", "dependencyIds", "status",
    ]
    origin: Literal["mapped", "extracted", "user", "estimated"]
    sourceField: str | None = None
    quote: str | None = None
    needsConfirmation: bool = False


class TaskSource(IngestionModel):
    integration: Literal["gmail", "notion", "github", "canvas", "google_calendar", "manual"]
    accountId: str = Field(min_length=1)
    sourceId: str = Field(min_length=1)
    # One email/page can contain multiple tasks. Retain this key across syncs.
    sourceItemKey: str = Field(min_length=1)
    sourceUrl: HttpUrl | None = None
    updatedAt: AwareDatetime | None = None


class NormalizedTask(IngestionModel):
    """Validated facts for persistence and the future deterministic engine.

    Separate from TaskSchema, which is the existing frontend response contract.
    Calendar records normally become availability constraints, not tasks.
    Date-only deadlines remain date-only until an explicit timezone/time policy
    resolves them; do not silently invent a midnight or end-of-day deadline.
    """

    id: str = Field(min_length=1)
    source: TaskSource
    title: str = Field(min_length=1)
    description: str = ""
    deadlineAt: AwareDatetime | None = None
    deadlineDate: date | None = None
    isHardDeadline: bool | None = None
    estimatedHours: float | None = Field(default=None, gt=0)
    importance: ImportanceLevel | None = None
    consequencesOfDelay: str | None = None
    status: Literal["pending", "completed", "cancelled"] = "pending"
    dependencyIds: list[str] = Field(default_factory=list)
    evidence: list[FieldEvidence] = Field(default_factory=list)
    requiresReview: bool = False
    ingestedAt: AwareDatetime

    @model_validator(mode="after")
    def validate_deadline(self):
        if self.deadlineAt is not None and self.deadlineDate is not None:
            raise ValueError("Use either deadlineAt or deadlineDate")
        return self
