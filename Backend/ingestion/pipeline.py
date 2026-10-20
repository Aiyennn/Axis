"""Replay fixtures through the same adapter and validation boundaries as live data."""
import json
from uuid import NAMESPACE_URL, uuid5
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field
from Backend.integrations.adapters import adapt
from Backend.models.integrations import NormalizedTask, GoogleCalendarRecord, FieldEvidence
from .extraction import FIXTURES, FixtureExtractor, Extractor
from .validation import normalize


class ImportPreview(BaseModel):
    ownerId: str = Field(exclude=True)
    extractionMode: str
    tasks: list[NormalizedTask] = Field(default_factory=list)
    calendarEvents: list[GoogleCalendarRecord] = Field(default_factory=list)
    issues: list[dict] = Field(default_factory=list)
    snapshots: dict[str, dict] = Field(default_factory=dict, exclude=True)
    processedRecords: int = 0
    ignoredRecords: int = 0


def load_fixtures():
    return json.loads((FIXTURES / "sources.json").read_text(encoding="utf-8"))


def manual_task(record, user_id):
    fields = ("title", "description", "deadlineAt", "deadlineDate", "isHardDeadline",
              "estimatedHours", "importance", "consequencesOfDelay")
    values = {name: getattr(record, name) for name in fields}
    identity = json.dumps([user_id, record.integration, record.accountId, record.sourceId, "primary"])
    return NormalizedTask(
        id=str(uuid5(NAMESPACE_URL, identity)),
        source=dict(integration="manual", accountId=record.accountId, sourceId=record.sourceId,
                    sourceItemKey="primary", sourceUrl=record.sourceUrl, updatedAt=record.updatedAt),
        ingestedAt=record.fetchedAt,
        evidence=[FieldEvidence(field=name, origin="user", sourceField=name)
                  for name, value in values.items() if value is not None],
        **values,
    )


def preview_import(envelopes=None, *, user_id: str, timezone="Asia/Shanghai",
                   extractor: Extractor | None = None) -> ImportPreview:
    ZoneInfo(timezone)
    extractor = extractor or FixtureExtractor()
    result = ImportPreview(ownerId=user_id, extractionMode=extractor.mode)
    for envelope in load_fixtures() if envelopes is None else envelopes:
        try:
            record = adapt(envelope)
            if record.integration == "google_calendar":
                result.calendarEvents.append(record)
                result.processedRecords += 1
                continue
            if record.integration == "manual":
                tasks, issues = [manual_task(record, user_id)], []
            else:
                tasks, issues = normalize(record, extractor.extract(record), user_id=user_id, timezone=timezone)
            result.tasks.extend(tasks)
            result.issues.extend(issues)
            for task in tasks:
                result.snapshots[task.id] = {
                    "raw": envelope["payload"],
                    "mapped": record.model_dump(mode="json", exclude={"fetchedAt"}),
                    "extractionMode": extractor.mode,
                }
            result.processedRecords += 1
            result.ignoredRecords += int(not tasks)
        except Exception as exc:
            # Preserve valid records but surface each failed record explicitly.
            # Don't leak provider errors, source payloads or credentials to clients.
            result.issues.append(dict(
                integration=envelope.get("integration"), sourceId=str(envelope.get("payload", {}).get("id", "")),
                code="RECORD_REJECTED", errorType=type(exc).__name__,
            ))
    return result
