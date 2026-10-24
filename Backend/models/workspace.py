from typing import Literal
from pydantic import Field
from Backend.models.integrations import IngestionModel


class MockSyncRequest(IngestionModel):
    integrations: list[Literal["canvas", "google_calendar", "gmail", "github", "notion", "manual"]] = Field(min_length=1, max_length=6)
    reset: bool = False


class TaskEdit(IngestionModel):
    version: int = Field(ge=1)
    status: Literal["pending", "completed"] | None = None
    estimatedHours: float | None = Field(default=None, gt=0, le=10000, allow_inf_nan=False)
    importance: Literal["high", "medium", "low"] | None = None
    confirmEvidence: bool = False


