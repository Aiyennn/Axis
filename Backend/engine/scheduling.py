"""Deterministic split-work allocation and conservative deadline repair."""
from dataclasses import dataclass
from datetime import datetime, timedelta

from Backend.models.priority import BusyInterval, RankedTask
from .calendar import hours
from .metrics import TaskMetrics

Block = tuple[datetime, datetime]
EPSILON_HOURS = 1e-9


@dataclass(frozen=True)
class Allocation:
    blocks: tuple[Block, ...]
    remaining: tuple[Block, ...]
    complete: bool

    @property
    def completion(self) -> datetime | None:
        if not self.complete or not self.blocks:
            return None
        return self.blocks[-1][1]

    def to_intervals(self) -> list[BusyInterval]:
        return [BusyInterval(start=start, end=end) for start, end in self.blocks]


def allocate(blocks: tuple[Block, ...], effort: float) -> Allocation:
    planned, remaining = [], []
    needed = effort
    for start, end in blocks:
        if needed <= EPSILON_HOURS:
            remaining.append((start, end))
            continue
        amount = min(needed, hours(start, end))
        finish = start + timedelta(hours=amount)
        planned.append((start, finish))
        needed -= amount
        if finish < end:
            remaining.append((finish, end))
    return Allocation(tuple(planned), tuple(remaining), needed <= EPSILON_HOURS)


def deadline_misses(order: list[RankedTask], blocks: list[Block],
                    metrics_by_id: dict[str, TaskMetrics]) -> set[str]:
    remaining = tuple(blocks)
    misses = set()
    for row in order:
        metrics = metrics_by_id[row.taskId]
        effort = metrics.item.task.estimatedHours
        if row.tier == "blocked" or effort is None:
            continue
        result = allocate(remaining, effort)
        remaining = result.remaining
        if metrics.deadline and (result.completion is None or result.completion > metrics.deadline):
            misses.add(row.taskId)
    return misses


def repair_deadline_order(rows: list[RankedTask], blocks: list[Block],
                          metrics_by_id: dict[str, TaskMetrics]) -> tuple[list[RankedTask], bool]:
    """Try earliest-deadline order for schedulable tasks.

    Adopt it only when it removes at least one projected miss and introduces
    none. Preserve positions of blocked/unknown-effort tasks. This is a bounded
    heuristic, not an optimal scheduler or a dependency graph scheduler.
    """
    schedulable = [
        row for row in rows
        if row.tier != "blocked" and metrics_by_id[row.taskId].item.task.estimatedHours is not None
    ]
    ordered = iter(sorted(schedulable, key=lambda row: (
        row.deadlineAt is None, row.deadlineAt, row.rank,
    )))
    eligible_ids = {row.taskId for row in schedulable}
    candidate = [next(ordered) if row.taskId in eligible_ids else row for row in rows]
    original_misses = deadline_misses(rows, blocks, metrics_by_id)
    candidate_misses = deadline_misses(candidate, blocks, metrics_by_id)
    if candidate_misses < original_misses:
        return candidate, True
    return rows, False
