"""Compute task facts independently of ranking and scheduling policy."""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from Backend.models.priority import PriorityContext, PriorityTask
from .calendar import available_before

UTC = timezone.utc


@dataclass(frozen=True)
class TaskMetrics:
    item: PriorityTask
    deadline: datetime | None
    capacity: float | None
    slack: float | None
    overdue: bool
    age_days: int
    blocked_by: tuple[str, ...]
    warnings: tuple[str, ...]
    facts: tuple[dict, ...]


def resolve_deadline(item: PriorityTask, context: PriorityContext) -> datetime | None:
    task = item.task
    if task.deadlineAt is not None:
        return task.deadlineAt.astimezone(UTC)
    if task.deadlineDate is None or context.dateOnlyDeadlineTime is None:
        return None
    return datetime.combine(task.deadlineDate, context.dateOnlyDeadlineTime,
                            ZoneInfo(context.timezone)).astimezone(UTC)


def calculate_metrics(item: PriorityTask, context: PriorityContext,
                      blocks: list[tuple[datetime, datetime]],
                      tasks_by_id: dict[str, PriorityTask]) -> TaskMetrics:
    task = item.task
    now = context.now.astimezone(UTC)
    zone = ZoneInfo(context.timezone)
    deadline = resolve_deadline(item, context)
    horizon = datetime.combine(now.astimezone(zone).date() + timedelta(days=context.horizonDays),
                               datetime.min.time(), zone).astimezone(UTC)
    capacity = None
    slack = None
    if deadline is not None and deadline <= horizon and task.estimatedHours is not None:
        capacity = available_before(blocks, deadline)
        slack = capacity - task.estimatedHours
    overdue = deadline is not None and deadline <= now
    blocked_by = tuple(sorted({
        dep for dep in task.dependencyIds
        if dep not in tasks_by_id or tasks_by_id[dep].task.status != "completed"
    }))
    age = max(0, (now - item.createdAt.astimezone(UTC)).days)
    warning_rules = (
        (task.deadlineDate is not None and deadline is None, "DATE_ONLY_DEADLINE_UNRESOLVED"),
        (deadline is None, "DEADLINE_UNKNOWN"),
        (deadline is not None and deadline > horizon, "DEADLINE_BEYOND_PLANNING_HORIZON"),
        (overdue, "DEADLINE_OVERDUE"),
        (task.estimatedHours is None, "EFFORT_UNKNOWN"),
        (task.importance is None, "IMPORTANCE_UNKNOWN"),
        (item.delayImpact == "unknown", "DELAY_IMPACT_UNKNOWN"),
        (task.requiresReview or any(e.needsConfirmation for e in task.evidence), "FACTS_REQUIRE_REVIEW"),
        (task.isHardDeadline is None, "DEADLINE_STRICTNESS_UNKNOWN"),
        (bool(blocked_by), "UNRESOLVED_DEPENDENCIES"),
        (slack is not None and slack < 0, "INSUFFICIENT_CAPACITY_BEFORE_DEADLINE"),
    )
    facts = [
        {"code": "DEADLINE", "at": deadline.isoformat() if deadline else None, "hard": task.isHardDeadline},
        {"code": "WORK_CAPACITY", "availableHours": capacity, "effortHours": task.estimatedHours, "slackHours": slack},
        {"code": "SCORING_INPUTS", "delayImpact": item.delayImpact, "importance": task.importance, "waitingDays": age},
    ]
    if task.deadlineDate is not None and deadline is not None:
        facts.append({"code": "DATE_ONLY_POLICY_APPLIED", "time": context.dateOnlyDeadlineTime.isoformat()})
    if blocked_by:
        facts.append({"code": "BLOCKED_BY", "taskIds": list(blocked_by)})
    return TaskMetrics(item, deadline, capacity, slack, overdue, age, blocked_by,
                       tuple(code for matches, code in warning_rules if matches), tuple(facts))
