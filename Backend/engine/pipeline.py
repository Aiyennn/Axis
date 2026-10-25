"""Orchestrate metrics, policy, deadline repair and final assessments."""
from Backend.models.priority import PriorityRequest, PriorityResult, RankedTask
from .assessment import attach_allocation, build_assessment, choose_bucket, ranking_key
from .calendar import free_blocks
from .metrics import TaskMetrics, calculate_metrics
from .policy import DEFAULT_POLICY
from .scheduling import Block, allocate, repair_deadline_order
from datetime import timedelta
from zoneinfo import ZoneInfo


def schedule_assessments(rows: list[RankedTask], blocks: list[Block],
                         metrics: dict[str, TaskMetrics], context=None) -> None:
    remaining = tuple(blocks)
    for row in rows:
        if row.tier == "blocked":
            continue
        effort = metrics[row.taskId].item.task.estimatedHours
        if effort is None:
            row.warnings.append("NOT_ALLOCATED_WITHOUT_EFFORT")
            row.decisionFacts.append({"code": "ACTION_REQUIRED", "action": "estimate_remaining_effort"})
            continue
        bucket = context.bucketOverrides.get(row.taskId) if context else None
        if bucket in {'next', 'later'}:
            zone = ZoneInfo(context.timezone)
            earliest = context.now.astimezone(zone).date() + timedelta(days=1 if bucket == 'next' else 2)
            reserved = tuple(b for b in remaining if b[0].astimezone(zone).date() < earliest)
            eligible = tuple(b for b in remaining if b[0].astimezone(zone).date() >= earliest)
        else:
            reserved, eligible = (), remaining
        allocation = allocate(eligible, effort)
        remaining = reserved + allocation.remaining
        attach_allocation(row, allocation)


def rank_tasks(request: PriorityRequest) -> PriorityResult:
    """Same validated inputs produce the same result; no clock, DB or AI calls."""
    policy = DEFAULT_POLICY
    blocks = free_blocks(request.context)
    tasks_by_id = {item.task.id: item for item in request.tasks}
    metrics = {
        item.task.id: calculate_metrics(item, request.context, blocks, tasks_by_id)
        for item in request.tasks if item.task.status == "pending"
    }
    rows = [build_assessment(item, request.context, policy) for item in metrics.values()]
    rows.sort(key=lambda row: ranking_key(row, metrics[row.taskId]))
    for rank, row in enumerate(rows, 1):
        row.rank = rank
    original_ranks = {row.taskId: row.rank for row in rows}
    rows, repaired = repair_deadline_order(rows, blocks, metrics)
    repaired_ranks = {row.taskId: rank for rank, row in enumerate(rows, 1)}
    if request.context.bucketOverrides:
        rows.sort(key=lambda row: {'now': 0, 'next': 1, 'later': 2}[
            request.context.bucketOverrides.get(row.taskId, choose_bucket(row, request.context))])
    schedule_assessments(rows, blocks, metrics, request.context)
    for row in rows:
        row.priorityBucket = choose_bucket(row, request.context)
        if row.taskId in request.context.bucketOverrides and row.tier != 'blocked':
            row.priorityBucket = request.context.bucketOverrides[row.taskId]
            row.decisionFacts.append({'code': 'USER_BUCKET_OVERRIDE', 'bucket': row.priorityBucket})
        if repaired and original_ranks[row.taskId] != repaired_ranks[row.taskId]:
            row.decisionFacts.append({
                "code": "DEADLINE_ORDER_REPAIRED", "originalRank": original_ranks[row.taskId],
                "reason": "Removes projected deadline misses without introducing new misses.",
            })
    # Allocation can turn previously normal tasks into Now work. Publish the
    # final buckets in display order rather than leaving a deferred task first.
    if request.context.bucketOverrides:
        rows.sort(key=lambda row: {'now': 0, 'next': 1, 'later': 2}[row.priorityBucket])
    for rank, row in enumerate(rows, 1):
        row.rank = rank
    excluded = sorted(set(tasks_by_id) - set(metrics))
    return PriorityResult(engineVersion="2", policyVersion=policy.version,
                          generatedAt=request.context.now, rankings=rows, excludedTaskIds=excluded)
