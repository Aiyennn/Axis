"""Versioned ranking policy. Scoring values and precedence live here."""
from dataclasses import dataclass
from datetime import timedelta
from types import MappingProxyType
from Backend.models.priority import PriorityContext
from .metrics import TaskMetrics

IMPACT_POINTS = MappingProxyType({"critical": 25, "significant": 15, "minor": 5, "unknown": 0})
IMPORTANCE_POINTS = MappingProxyType({"high": 15, "medium": 10, "low": 5, None: 0})
TIER_ORDER = MappingProxyType({"deadline_at_risk": 0, "time_sensitive": 1, "normal": 2, "blocked": 3})
SLACK_POINTS = ((0, 50), (1, 45), (3, 35), (8, 25), (float("inf"), 10))


@dataclass(frozen=True)
class RankingPolicy:
    version: str = "slack-v2"
    time_sensitive_hours: int = 24
    maximum_age_points: int = 10

    def urgency(self, metrics: TaskMetrics) -> int:
        if metrics.overdue:
            return 50
        if metrics.slack is None:
            return 0
        return next(points for limit, points in SLACK_POINTS if metrics.slack <= limit)

    def at_risk(self, metrics: TaskMetrics, context: PriorityContext) -> bool:
        if not metrics.item.task.isHardDeadline or metrics.deadline is None:
            return False
        if metrics.overdue:
            return True
        if metrics.slack is not None:
            return metrics.slack <= context.safetyBufferHours
        # Missing effort must not conceal an imminent hard deadline.
        return metrics.deadline <= context.now + timedelta(hours=context.safetyBufferHours)

    def tier(self, metrics: TaskMetrics, context: PriorityContext) -> str:
        rules = (
            (bool(metrics.blocked_by), "blocked"),
            (self.at_risk(metrics, context), "deadline_at_risk"),
            (metrics.deadline is not None and
             metrics.deadline <= context.now + timedelta(hours=self.time_sensitive_hours), "time_sensitive"),
        )
        return next((tier for matches, tier in rules if matches), "normal")

    def score(self, metrics: TaskMetrics) -> dict[str, int]:
        return {
            "urgency": self.urgency(metrics),
            "delayImpact": IMPACT_POINTS[metrics.item.delayImpact],
            "importance": IMPORTANCE_POINTS[metrics.item.task.importance],
            "waitingAge": min(metrics.age_days, self.maximum_age_points),
        }


DEFAULT_POLICY = RankingPolicy()
