"""Build explainable decisions and attach scheduling results."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from Backend.models.priority import PriorityContext, RankedTask
from .calendar import hours
from .metrics import TaskMetrics
from .policy import RankingPolicy, TIER_ORDER
from .scheduling import Allocation

UTC = timezone.utc


def build_assessment(metrics: TaskMetrics, context: PriorityContext,
                     policy: RankingPolicy) -> RankedTask:
    breakdown = policy.score(metrics)
    facts = list(metrics.facts)
    if policy.at_risk(metrics, context):
        facts.append({"code": "HARD_DEADLINE_AT_RISK"})
    return RankedTask(
        taskId=metrics.item.task.id, taskVersion=metrics.item.version, rank=1,
        priorityScore=sum(breakdown.values()), priorityBucket="later",
        tier=policy.tier(metrics, context), scoreBreakdown=breakdown,
        decisionFacts=facts, warnings=list(metrics.warnings),
        deadlineAt=metrics.deadline, slackHours=metrics.slack,
    )


def ranking_key(row: RankedTask, metrics: TaskMetrics) -> tuple:
    return (
        TIER_ORDER[row.tier], -row.priorityScore,
        row.deadlineAt or datetime.max.replace(tzinfo=UTC),
        metrics.item.createdAt.astimezone(UTC), row.taskId,
    )


def choose_bucket(row: RankedTask, context: PriorityContext) -> str:
    if row.tier == "blocked":
        return "later"
    if row.tier in {"deadline_at_risk", "time_sensitive"}:
        return "now"
    today = context.now.astimezone(ZoneInfo(context.timezone)).date()
    if any(block.start.astimezone(ZoneInfo(context.timezone)).date() == today
           for block in row.plannedWork):
        return "now"
    return "next" if row.plannedWork else "later"


def attach_allocation(row: RankedTask, allocation: Allocation) -> None:
    row.plannedWork = allocation.to_intervals()
    row.projectedCompletionAt = allocation.completion
    if not allocation.complete:
        row.warnings.append("EXCEEDS_REMAINING_PLANNING_CAPACITY")
    if row.deadlineAt and (allocation.completion is None or allocation.completion > row.deadlineAt):
        row.warnings.append("PROJECTED_DEADLINE_MISS")
    row.decisionFacts.append({
        "code": "CAPACITY_ALLOCATION", "splittable": True,
        "allocatedHours": sum(hours(start, end) for start, end in allocation.blocks),
    })
