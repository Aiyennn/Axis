"""Application pipeline for the mock workspace. No integration network calls."""
import os
import logging
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from Backend.models.db_models import CalendarSourceModel, PriorityRunModel
from Backend.models.integrations import GoogleCalendarRecord
from Backend.models.priority import PriorityContext
from Backend.services.priority_store import create_priority_run
from Backend.explanations.service import current_run_view, explain_run, explanation_context, assessments

MOCK_NOW = datetime.fromisoformat("2026-10-20T08:00:00+08:00")
logger = logging.getLogger(__name__)


def calendar_intervals(db, user_id):
    intervals, events = [], []
    zone = ZoneInfo("Asia/Shanghai")
    for row in db.scalars(select(CalendarSourceModel).where(CalendarSourceModel.user_id == user_id)):
        event = GoogleCalendarRecord.model_validate(row.record)
        if event.status == "cancelled" or not event.blocksTime:
            continue
        start = event.startAt or datetime.combine(event.startDate, time.min, zone)
        end = event.endAt or datetime.combine(event.endDate, time.min, zone)
        intervals.append({"start": start, "end": end})
        day_start = datetime.combine(MOCK_NOW.date(), time.min, zone)
        day_end = day_start + timedelta(days=1)
        if start < day_end and end > day_start:
            a, b = max(start, day_start), min(end, day_end)
            events.append(dict(id=f"{row.account_id}:{row.source_id}", title=event.title,
                               startHour=(a - day_start).total_seconds() / 3600,
                               endHour=(b - day_start).total_seconds() / 3600,
                               displayTime=f"{a.astimezone(zone):%H:%M}–{b.astimezone(zone):%H:%M}", type="busy"))
    return intervals, events


def rank_workspace(db, user_id):
    intervals, _ = calendar_intervals(db, user_id)
    return create_priority_run(db, user_id=user_id, context=PriorityContext(
        now=MOCK_NOW, timezone="Asia/Shanghai", busyIntervals=intervals,
        dateOnlyDeadlineTime=time(23, 59),
    ))[0]


def finish_run(factory, user_id, run_id, *, retry=False):
    # Mock ingestion always uses recorded extraction. Explanations may use
    # Gemini only when explicitly enabled in server configuration.
    logger.info("workspace.generation.started run_id=%s mode=%s retry=%s",
                run_id, os.getenv("EXPLANATION_MODE", "rules"), retry)
    result = explain_run(factory, user_id=user_id, run_id=run_id, retry=retry,
                use_ai=os.getenv("EXPLANATION_MODE", "rules") == "gemini")
    with factory() as db:
        view = workspace_view(db, user_id)
    logger.info("workspace.generation.completed run_id=%s result=%s returned_status=%s source=%s",
                run_id, result, view.get("status"), view.get("briefingSource"))
    return view


def workspace_view(db, user_id):
    view = current_run_view(db, user_id=user_id)
    _, events = calendar_intervals(db, user_id)
    empty = dict(tasks=[], calendarEvents=events, briefing={}, status="empty",
                 mockNow=MOCK_NOW.isoformat(), capacitySummary={})
    if not view:
        return empty
    if view["status"] == "stale":
        return {**empty, **view}
    run = db.get(PriorityRunModel, (user_id, view["runId"]))
    original = {item["task"]["id"]: item["task"] for item in run.context_snapshot["tasks"]}
    cards = []
    sources = {"gmail": "email", "manual": "task", "google_calendar": "calendar"}
    for item in view["tasks"]:
        task = original[item["taskId"]]
        planned = next((f["blocks"] for f in item["decisionFacts"] if f["code"] == "PLANNED_WORK"), [])
        cards.append(dict(
            id=item["taskId"], version=item["taskVersion"], rank=item["rank"],
            title=item["title"], description=item["description"],
            source=sources.get(task["source"]["integration"], task["source"]["integration"]),
            sourceLabel=task["source"]["integration"], sourceUrl=task["source"]["sourceUrl"],
            deadline=(datetime.fromisoformat(item["deadlineAt"]).astimezone(ZoneInfo("Asia/Shanghai")).strftime("%b %d, %H:%M")
                      if item["deadlineAt"] else item["deadlineDate"] or "No deadline"),
            deadlineAt=item["deadlineAt"], deadlineDate=item["deadlineDate"],
            isHardDeadline=item["isHardDeadline"], estimatedHours=item["estimatedHours"],
            importance=item["importance"], status="pending", priorityScore=item["score"],
            priorityBucket=item["bucket"], scoreBreakdown=item["scoreBreakdown"],
            reasoning=item["reasoning"], consequencesOfDelay=item["consequencesOfDelay"] or "",
            explanationSource=item["explanationSource"], explanationStatus=item["explanationStatus"],
            requiresReview=item["requiresReview"], evidence=item["sourceEvidence"],
            warnings=item["warnings"], plannedWork=planned,
        ))
    completed = [dict(id=t["id"], title=t["title"], version=item["version"])
                 for item in run.context_snapshot["tasks"]
                 for t in [item["task"]] if t["status"] == "completed"]
    summary = explanation_context(run, assessments(db, user_id, run.id))["capacitySummary"]
    return {**view, "tasks": cards, "completedTasks": completed, "calendarEvents": events,
            "mockNow": MOCK_NOW.isoformat(), "capacitySummary": summary}
