"""Persist rankings first; call the provider without holding a DB transaction."""
import json
import logging
from time import perf_counter
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from Backend.models.db_models import (
    TaskFactsModel, PriorityRunModel, PriorityAssessmentModel,
    CalendarSourceModel, utc_now,
)
from .contracts import validate_batch
from .fallback import fallback_batch
from .provider import GeminiExplanationProvider, PROMPT_VERSION
from Backend.models.priority import PriorityContext
from Backend.engine.calendar import free_blocks, available_before
from Backend.services.ownership import lock_owner

logger = logging.getLogger(__name__)


def calendar_revision(db, user_id):
    rows = db.execute(select(CalendarSourceModel).where(CalendarSourceModel.user_id == user_id)).scalars()
    return {json.dumps([row.account_id, row.source_id]): row.content_hash for row in rows}


def assessments(db, user_id, run_id):
    return list(db.execute(select(PriorityAssessmentModel).where(
        PriorityAssessmentModel.user_id == user_id, PriorityAssessmentModel.run_id == run_id,
    ).order_by(PriorityAssessmentModel.rank)).scalars())


def explanation_context(run, rows):
    inputs = {item["task"]["id"]: item for item in run.context_snapshot["tasks"]}
    tasks = []
    for row in rows:
        original = inputs[row.task_id]["task"]
        tasks.append(dict(
            assessmentId=row.id, taskId=row.task_id, taskVersion=row.task_version,
            title=original["title"], description=original["description"],
            sourceEvidence=original["evidence"], deadlineAt=original["deadlineAt"],
            deadlineDate=original["deadlineDate"], isHardDeadline=original["isHardDeadline"],
            dependencyIds=original["dependencyIds"],
            estimatedHours=original["estimatedHours"], importance=original["importance"],
            consequencesOfDelay=original["consequencesOfDelay"],
            requiresReview=original["requiresReview"], rank=row.rank,
            bucket=row.priority_bucket, score=row.priority_score, tier=row.tier,
            scoreBreakdown=row.score_breakdown, decisionFacts=row.decision_facts,
            warnings=row.warnings,
        ))
    context = PriorityContext.model_validate(run.context_snapshot["context"])
    zone = ZoneInfo(context.timezone)
    tomorrow = context.now.astimezone(zone).date() + timedelta(days=1)
    day_end = datetime.combine(tomorrow, datetime.min.time(), zone).astimezone(timezone.utc)
    summary = dict(
        pendingTaskCount=len(tasks),
        knownRemainingHours=sum(task["estimatedHours"] or 0 for task in tasks),
        unknownEffortTaskCount=sum(task["estimatedHours"] is None for task in tasks),
        availableWorkingHoursToday=available_before(free_blocks(context), day_end),
        projectedDeadlineMissCount=sum("PROJECTED_DEADLINE_MISS" in task["warnings"] for task in tasks),
    )
    return dict(runId=run.id, context=run.context_snapshot["context"], capacitySummary=summary, tasks=tasks)


def apply_batch(run, rows, batch, *, status, model=None):
    explanations = {item.assessmentId: item for item in batch.taskExplanations}
    timestamp = utc_now() if status != "pending" else None
    run.briefing = batch.briefing.model_dump()
    run.explanation_status = status
    run.explanation_model = model
    run.explanation_prompt_version = PROMPT_VERSION
    run.explanation_generated_at = timestamp
    for row in rows:
        explanation = explanations[row.id]
        row.explanation = explanation.summary + " " + explanation.context
        row.explanation_details = explanation.model_dump()
        row.explanation_status = status
        row.explanation_model = model
        row.explanation_prompt_version = PROMPT_VERSION
        row.explanation_generated_at = timestamp


def is_current(db, run):
    latest = db.scalar(select(func.max(PriorityRunModel.generation)).where(PriorityRunModel.user_id == run.user_id))
    if run.generation != latest:
        return False
    versions = dict(db.execute(select(TaskFactsModel.id, func.max(TaskFactsModel.version)).where(
        TaskFactsModel.user_id == run.user_id).group_by(TaskFactsModel.id)).all())
    expected = {item["task"]["id"]: item["version"] for item in run.context_snapshot["tasks"]}
    return versions == expected and calendar_revision(db, run.user_id) == run.calendar_snapshot


def explain_run(session_factory, *, user_id, run_id, provider=None, retry=False, use_ai=True):
    """Call after the ranking transaction commits. Returns generation state.

    An explicit retry supersedes any previous attempt token. Concurrent older
    attempts cannot overwrite the newer one. The caller may run this in a worker.
    """
    token = str(uuid.uuid4())
    started = perf_counter()
    logger.info("explanation.started run_id=%s attempt=%s use_ai=%s retry=%s", run_id, token, use_ai, retry)
    with session_factory.begin() as db:
        lock_owner(db, user_id)
        run = db.get(PriorityRunModel, (user_id, run_id))
        if run is None:
            raise ValueError("Run does not exist for this user")
        if not is_current(db, run):
            run.explanation_status = "stale"
            logger.warning("explanation.skipped run_id=%s reason=stale", run_id)
            return "stale"
        if not retry and run.explanation_status in {"ready", "generating", "fallback"}:
            logger.info("explanation.skipped run_id=%s reason=already_processed status=%s", run_id, run.explanation_status)
            return run.explanation_status
        rows = assessments(db, user_id, run_id)
        snapshot = explanation_context(run, rows)
        run.explanation_attempt = token
        run.explanation_status = "generating"
    provider = provider or GeminiExplanationProvider()
    error = None
    try:
        batch = fallback_batch(snapshot)
        status, model = "fallback", None
        if use_ai and snapshot["tasks"]:
            logger.info("explanation.provider.started run_id=%s model=%s tasks=%s", run_id, provider.model, len(snapshot["tasks"]))
            batch = validate_batch(provider.generate(snapshot), snapshot)
            status, model = "ready", provider.model
            logger.info("explanation.provider.validated run_id=%s model=%s explanations=%s", run_id, model, len(batch.taskExplanations))
        else:
            logger.info("explanation.fallback run_id=%s reason=%s", run_id, "ai_disabled" if not use_ai else "no_tasks")
    except Exception as exc:
        logger.error("explanation.provider.failed run_id=%s model=%s error_type=%s provider_code=%s provider_status=%s fallback=true duration_ms=%.0f",
                     run_id, provider.model, type(exc).__name__, getattr(exc, "code", None),
                     getattr(exc, "status", None), (perf_counter() - started) * 1000)
        batch = fallback_batch(snapshot)
        status, model, error = "fallback", None, type(exc).__name__
    with session_factory.begin() as db:
        lock_owner(db, user_id)
        run = db.get(PriorityRunModel, (user_id, run_id))
        if run.explanation_attempt != token:
            logger.warning("explanation.discarded run_id=%s reason=superseded", run_id)
            return "superseded"
        if not is_current(db, run):
            run.explanation_status = "stale"
            logger.warning("explanation.discarded run_id=%s reason=stale", run_id)
            return "stale"
        apply_batch(run, assessments(db, user_id, run_id), batch, status=status, model=model)
        run.explanation_error = error
    logger.info("explanation.saved run_id=%s status=%s model=%s error_type=%s duration_ms=%.0f",
                run_id, status, model, error, (perf_counter() - started) * 1000)
    return status


def current_run_view(db, *, user_id):
    """Frontend-ready output for a future authenticated route or local CLI."""
    run = db.execute(select(PriorityRunModel).where(PriorityRunModel.user_id == user_id)
                     .order_by(PriorityRunModel.generation.desc()).limit(1)).scalar_one_or_none()
    if run is None:
        return None
    if not is_current(db, run):
        return dict(runId=run.id, status="stale", requiresReprioritization=True, tasks=[])
    rows = assessments(db, user_id, run.id)
    snapshot = explanation_context(run, rows)
    by_id = {row.id: row for row in rows}
    for item in snapshot["tasks"]:
        row = by_id[item["assessmentId"]]
        item["reasoning"] = row.explanation
        item["explanation"] = row.explanation_details
        item["explanationStatus"] = row.explanation_status
        item["explanationSource"] = "ai" if row.explanation_status == "ready" else "rules"
    return dict(runId=run.id, status=run.explanation_status, briefing=run.briefing,
                briefingSource="ai" if run.explanation_status == "ready" else "rules",
                tasks=snapshot["tasks"])
