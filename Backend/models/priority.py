"""Inputs and outputs for deterministic priority policy v1."""
from datetime import datetime, timezone, time
from math import isfinite
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AwareDatetime, Field, field_validator, model_validator
from Backend.models.integrations import IngestionModel, NormalizedTask


class BusyInterval(IngestionModel):
    start: AwareDatetime
    end: AwareDatetime

    @model_validator(mode="after")
    def valid_interval(self):
        if self.end <= self.start:
            raise ValueError("end must be after start")
        return self


class PriorityContext(IngestionModel):
    now: AwareDatetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    timezone: str = "Asia/Shanghai"
    workdayStart: time = time(9)
    workdayEnd: time = time(18)
    workingDays: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])
    busyIntervals: list[BusyInterval] = Field(default_factory=list, max_length=2000)
    safetyBufferHours: float = Field(default=1, ge=0, le=24, allow_inf_nan=False)
    horizonDays: int = Field(default=30, ge=1, le=90)
    # None leaves date-only deadlines unresolved. Set a time explicitly to use them.
    dateOnlyDeadlineTime: time | None = None

    @field_validator("timezone")
    @classmethod
    def known_timezone(cls, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Unknown timezone") from exc
        return value

    @field_validator("workingDays")
    @classmethod
    def valid_days(cls, value):
        if not value or len(set(value)) != len(value) or any(d < 0 or d > 6 for d in value):
            raise ValueError("workingDays must contain unique weekdays 0 (Monday) through 6")
        return value

    @model_validator(mode="after")
    def valid_workday(self):
        times = [self.workdayStart, self.workdayEnd, self.dateOnlyDeadlineTime]
        if any(t is not None and t.tzinfo is not None for t in times):
            raise ValueError("Clock times must be local times without timezone offsets")
        if self.workdayEnd <= self.workdayStart:
            raise ValueError("workdayEnd must be after workdayStart")
        return self


class PriorityTask(IngestionModel):
    task: NormalizedTask
    version: int = Field(default=1, ge=1)
    createdAt: AwareDatetime
    # Explicit policy input, supplied by a user or a configured source mapping.
    # Never inferred from prose by this engine.
    delayImpact: Literal["critical", "significant", "minor", "unknown"] = "unknown"

    @field_validator("task")
    @classmethod
    def finite_effort(cls, task):
        if task.estimatedHours is not None and not isfinite(task.estimatedHours):
            raise ValueError("estimatedHours must be finite")
        return task


class PriorityRequest(IngestionModel):
    tasks: list[PriorityTask] = Field(default_factory=list, max_length=500)
    context: PriorityContext = Field(default_factory=PriorityContext)

    @model_validator(mode="after")
    def unique_tasks(self):
        ids = [t.task.id for t in self.tasks]
        if len(set(ids)) != len(ids):
            raise ValueError("Supply one current version per task ID")
        return self


class RankedTask(IngestionModel):
    taskId: str
    taskVersion: int
    rank: int
    priorityScore: int
    priorityBucket: Literal["now", "next", "later"]
    tier: Literal["deadline_at_risk", "time_sensitive", "normal", "blocked"]
    scoreBreakdown: dict[str, int]
    decisionFacts: list[dict]
    warnings: list[str]
    deadlineAt: AwareDatetime | None
    slackHours: float | None
    plannedWork: list[BusyInterval] = Field(default_factory=list)
    projectedCompletionAt: AwareDatetime | None = None


class PriorityResult(IngestionModel):
    engineVersion: str
    policyVersion: str
    generatedAt: AwareDatetime
    rankings: list[RankedTask]
    excludedTaskIds: list[str]
