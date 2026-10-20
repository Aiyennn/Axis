"""Evidence checks, explicit deadline normalization and source-field precedence."""
import re
import json
from datetime import date, datetime, time, timedelta
from uuid import NAMESPACE_URL, uuid5
from zoneinfo import ZoneInfo

from Backend.models.integrations import FieldEvidence, NormalizedTask, TaskSource
from .extraction import Extraction, source_text


def resolve_expression(expression, reference, zone):
    """Small explicit grammar. Unsupported expressions go to review, not guessing."""
    value = expression.strip()
    try:
        if "T" in value:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                return None
            return "deadlineAt", parsed
        return "deadlineDate", date.fromisoformat(value)
    except ValueError:
        pass
    match = re.fullmatch(r"(noon|midnight|\d{1,2}:\d{2}\s*[ap]m)\s+(today|tomorrow)", value, re.I)
    if not match:
        return None
    clock, day = match.groups()
    clock = clock.lower()
    try:
        at = {"noon": time(12), "midnight": time(0)}.get(clock)
        if at is None:
            at = datetime.strptime(clock.upper(), "%I:%M %p").time()
    except ValueError:
        return None
    local_date = reference.astimezone(zone).date() + timedelta(days=day.lower() == "tomorrow")
    return "deadlineAt", datetime.combine(local_date, at, zone)


def validate_quotes(record, candidate):
    text = source_text(record)
    quotes = {entry.field: entry.quote for entry in candidate.evidence}
    if len(quotes) != len(candidate.evidence):
        raise ValueError("Duplicate field evidence")
    values = candidate.model_dump(exclude={"itemKey", "evidence"})
    for field, value in values.items():
        if value is None:
            continue
        quote = quotes.get(field, "")
        if not quote.strip() or quote not in text:
            raise ValueError(f"Missing or unsupported evidence for {field}")
    if candidate.deadlineExpression and candidate.deadlineExpression.casefold() not in quotes["deadlineExpression"].casefold():
        raise ValueError("Deadline expression must appear in its supporting quote")


def normalize(record, extraction: Extraction, *, user_id: str, timezone: str):
    """Return normalized tasks and field issues. Never accept LLM-owned identity."""
    zone = ZoneInfo(timezone)
    if len({item.itemKey for item in extraction.tasks}) != len(extraction.tasks):
        raise ValueError("Duplicate extracted task keys")
    if record.integration != "gmail" and [item.itemKey for item in extraction.tasks] != ["primary"]:
        raise ValueError("Structured task sources must preserve exactly one primary task")
    result, issues = [], []
    for candidate in extraction.tasks:
        validate_quotes(record, candidate)
        source = TaskSource(
            integration=record.integration, accountId=record.accountId, sourceId=record.sourceId,
            sourceItemKey=candidate.itemKey, sourceUrl=record.sourceUrl, updatedAt=record.updatedAt,
        )
        identity = json.dumps([user_id, record.integration, record.accountId, record.sourceId, candidate.itemKey])
        values = dict(id=str(uuid5(NAMESPACE_URL, identity)), source=source, title=candidate.title,
                      description=source_text(record), ingestedAt=record.fetchedAt, evidence=[],
                      requiresReview=True)
        for field in ("title", "isHardDeadline", "estimatedHours", "importance", "consequencesOfDelay"):
            value = getattr(candidate, field)
            if value is not None:
                values[field] = value
                quote = next(q.quote for q in candidate.evidence if q.field == field)
                values["evidence"].append(FieldEvidence(field=field, origin="extracted", quote=quote,
                                                         sourceField="sourceText", needsConfirmation=True))
        if candidate.deadlineExpression:
            reference = getattr(record, "receivedAt", None) or record.updatedAt or record.fetchedAt
            resolved = resolve_expression(candidate.deadlineExpression, reference, zone)
            if resolved:
                field, value = resolved
                values[field] = value
                quote = next(q.quote for q in candidate.evidence if q.field == "deadlineExpression")
                values["evidence"].append(FieldEvidence(field=field, origin="extracted", quote=quote,
                                                         sourceField="sourceText", needsConfirmation=True))
            else:
                issues.append(dict(sourceId=record.sourceId, itemKey=candidate.itemKey,
                                   code="UNRESOLVED_DEADLINE", expression=candidate.deadlineExpression))
        # Explicit source fields always win over extraction. Milestones, grades,
        # labels and submission state are deliberately not promoted to task facts.
        mapped = {"title": getattr(record, "title", None),
                  "deadlineAt": getattr(record, "dueAt", None),
                  "deadlineDate": getattr(record, "dueDate", None)}
        for field, value in mapped.items():
            if value is None:
                continue
            replaced = {field}
            if field.startswith("deadline"):
                replaced = {"deadlineAt", "deadlineDate"}
            for old in replaced:
                values.pop(old, None)
            values["evidence"] = [e for e in values["evidence"] if e.field not in replaced]
            values[field] = value
            source_field = {"deadlineAt": "dueAt", "deadlineDate": "dueDate"}.get(field, field)
            values["evidence"].append(FieldEvidence(field=field, origin="mapped", sourceField=source_field))
        values["requiresReview"] = any(e.needsConfirmation for e in values["evidence"]) or any(
            issue.get("itemKey") == candidate.itemKey and issue["sourceId"] == record.sourceId for issue in issues)
        result.append(NormalizedTask(**values))
    return result, issues
