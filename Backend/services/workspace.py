"""Workspace workflows and presentation of persisted priority runs."""
import logging
from Backend.observability import log_stage
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from Backend.config import WorkspaceSettings, workspace_settings
from Backend.models.workspace import MockSyncRequest, TaskEdit
from Backend.ingestion.pipeline import preview_import, load_fixtures
from Backend.ingestion.extraction import GeminiExtractor
from Backend.ingestion.store import persist_import
from Backend.services.calendar import reconcile_calendar
from Backend.services.task_versions import revise_task
from Backend.services.ownership import lock_owner
from Backend.services.errors import BriefingUnavailable, WorkspaceConflict

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


def rank_workspace(db, user_id, bucket_overrides=None):
    # Read calendar inputs under the same lock used to snapshot tasks and runs.
    lock_owner(db, user_id)
    previous = db.scalar(select(PriorityRunModel).where(PriorityRunModel.user_id == user_id)
                         .order_by(PriorityRunModel.generation.desc()).limit(1))
    overrides = dict(previous.context_snapshot['context'].get('bucketOverrides', {})) if previous else {}
    overrides.update(bucket_overrides or {})
    intervals, _ = calendar_intervals(db, user_id)
    return create_priority_run(db, user_id=user_id, context=PriorityContext(
        now=MOCK_NOW, timezone="Asia/Shanghai", busyIntervals=intervals,
        dateOnlyDeadlineTime=time(23, 59),
        bucketOverrides=overrides,
    ))[0]


def finish_run(factory, user_id, run_id, *, retry=False, settings=None):
    settings = settings or workspace_settings()
    # Generation runs after the caller has committed the ranking.
    logger.info("workspace.generation.started run_id=%s mode=%s retry=%s",
                run_id, settings.explanation_mode, retry)
    with log_stage(logger, "workspace.briefing.generate", run_id=run_id, mode=settings.explanation_mode):
        result = explain_run(factory, user_id=user_id, run_id=run_id, retry=retry,
                    use_ai=settings.ai_briefings_enabled)
    with log_stage(logger, "workspace.database.load_result"), factory() as db:
        view = workspace_view(db, user_id)
    logger.info("workspace.generation.completed run_id=%s result=%s returned_status=%s source=%s",
                run_id, result, view.get("status"), view.get("briefingSource"))
    return {**view, "aiBriefingsEnabled": settings.ai_briefings_enabled}


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


class WorkspaceService:
    """Coordinate workspace operations and own their transaction boundaries.

    Extraction happens before writes; explanations run only after commit.
    Revision/import and ranking are atomic and share the existing owner lock.
    """

    def __init__(self, factory, settings: WorkspaceSettings):
        self.factory = factory
        self.settings = settings

    def read(self, user_id):
        with log_stage(logger, "workspace.database.read"), self.factory() as db:
            view = workspace_view(db, user_id)
        logger.info("workspace.loaded run_id=%s status=%s source=%s tasks=%s generation_requested=false",
                    view.get("runId"), view.get("status"), view.get("briefingSource"), len(view.get("tasks", [])))
        return {**view, "aiBriefingsEnabled": self.settings.ai_briefings_enabled}

    def apply_plan(self, user_id, proposal):
        with self.factory.begin() as db:
            lock_owner(db, user_id)
            view = workspace_view(db, user_id)
            if not proposal.runId or proposal.runId != view.get('runId') or view['status'] == 'stale':
                raise WorkspaceConflict('The schedule has changed. Ask Axis for a new proposal.')
            tasks = {t['id']: t for t in view['tasks']}
            if len({m.taskId for m in proposal.moves}) != len(proposal.moves):
                raise WorkspaceConflict('The proposal must contain unique task moves.')
            for move in proposal.moves:
                task = tasks.get(move.taskId)
                if not task or task['priorityBucket'] != move.fromBucket:
                    raise WorkspaceConflict('The task has changed. Ask Axis for a new proposal.')
            run_id = rank_workspace(db, user_id, {m.taskId: m.toBucket for m in proposal.moves})
        return self.finish(user_id, run_id)

    def finish(self, user_id, run_id, *, retry=False):
        return finish_run(self.factory, user_id, run_id, retry=retry, settings=self.settings)

    def retry_briefing(self, user_id):
        logger.info("workspace.briefing.retry.started")
        if not self.settings.ai_briefings_enabled:
            raise BriefingUnavailable("AI briefings are disabled in the server configuration.")
        with log_stage(logger, "workspace.database.check_briefing"), self.factory() as db:
            view = current_run_view(db, user_id=user_id)
        if not view:
            raise WorkspaceConflict("Import tasks before generating a briefing.")
        if view["status"] == "stale":
            raise WorkspaceConflict("Your tasks have changed. Refresh priorities before retrying.")
        if view["status"] == "generating":
            # Explicit retries replace the attempt token. A request interrupted by
            # a server restart must not permanently prevent future generation.
            logger.warning("workspace.briefing.retry.superseding run_id=%s", view["runId"])
        return self.finish(user_id, view["runId"], retry=True)

    def sync_mock(self, user_id, body: MockSyncRequest | None = None):
        logger.info("workspace.sync.started extraction_mode=%s integrations=%s",
                    self.settings.extraction_mode, body.integrations if body else "all")
        extractor = GeminiExtractor() if self.settings.extraction_mode == "gemini" else None
        envelopes = None if body is None else [
            envelope for envelope in load_fixtures() if envelope["integration"] in body.integrations
        ]
        with log_stage(logger, "workspace.ingestion.extract", mode=self.settings.extraction_mode):
            preview = preview_import(envelopes, user_id=user_id, extractor=extractor)
        with log_stage(logger, "workspace.database.import_and_rank"), self.factory.begin() as db:
            reconcile_calendar(db, user_id, preview,
                               selected=body is None or "google_calendar" in body.integrations)
            counts = persist_import(db, user_id=user_id, preview=preview, reset=body.reset if body else False)
            run_id = rank_workspace(db, user_id)
        logger.info("workspace.sync.imported run_id=%s issues=%s", run_id, len(preview.issues))
        return {**self.finish(user_id, run_id),
                "importResult": {**counts, "issues": preview.issues, "mode": preview.extractionMode}}

    def refresh(self, user_id):
        logger.info("workspace.refresh.started")
        with log_stage(logger, "workspace.database.refresh_and_rank"), self.factory.begin() as db:
            run_id = rank_workspace(db, user_id)
        return self.finish(user_id, run_id)

    def edit_task(self, user_id, task_id: str, body: TaskEdit):
        logger.info("workspace.edit.started task_id=%s fields=%s", task_id, sorted(body.model_fields_set))
        with log_stage(logger, "workspace.database.edit_and_rank"), self.factory.begin() as db:
            revise_task(db, user_id, task_id, body)
            run_id = rank_workspace(db, user_id)
        return self.finish(user_id, run_id)
