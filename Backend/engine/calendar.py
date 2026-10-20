"""Working-time calculations; all interval arithmetic uses UTC."""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from Backend.models.priority import PriorityContext

UTC = timezone.utc

def hours(start: datetime, end: datetime) -> float:
    return (end - start).total_seconds() / 3600


def free_blocks(context: PriorityContext) -> list[tuple[datetime, datetime]]:
    """Build UTC blocks from local working hours and subtract merged busy time."""
    zone = ZoneInfo(context.timezone)
    now = context.now.astimezone(UTC)
    first = context.now.astimezone(zone).date()
    busy = sorted((b.start.astimezone(UTC), b.end.astimezone(UTC)) for b in context.busyIntervals)
    blocks = []
    for offset in range(context.horizonDays):
        day = first + timedelta(days=offset)
        if day.weekday() not in context.workingDays:
            continue
        start = max(now, datetime.combine(day, context.workdayStart, zone).astimezone(UTC))
        end = datetime.combine(day, context.workdayEnd, zone).astimezone(UTC)
        cursor = start
        for a, b in busy:
            if b <= cursor or a >= end:
                continue
            if a > cursor:
                blocks.append((cursor, min(a, end)))
            cursor = max(cursor, b)
        if cursor < end:
            blocks.append((cursor, end))
    return blocks


def available_before(blocks: list[tuple[datetime, datetime]], deadline: datetime) -> float:
    return sum(max(0, hours(a, min(b, deadline))) for a, b in blocks if a < deadline)


