"""Trusted application entry point for assessing one user's latest task facts."""
import uuid
from datetime import timezone

from sqlalchemy import func, select

from Backend.models.db_models import TaskFactsModel, PriorityAssessmentModel, PriorityRunModel
from Backend.explanations.service import calendar_revision, explanation_context, apply_batch
from Backend.services.ownership import lock_owner
from Backend.explanations.fallback import fallback_batch
from Backend.models.priority import PriorityContext, PriorityRequest, PriorityTask
from Backend.engine import rank_tasks


def _aware(value):
    # PostgreSQL returns aware timestamps. SQLite drops timezone metadata; rows
    # written through from_normalized are normalized to UTC before persistence.
    return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


def create_priority_run(db, *, user_id: str, context: PriorityContext,
                        delay_impacts: dict | None = None):
    """Flush assessments, leaving commit/rollback to the caller.

    user_id must come from trusted application context, never ingestion data.
    No public write route is exposed before authentication exists.
    """
    lock_owner(db, user_id)
    latest = (select(TaskFactsModel.id, func.max(TaskFactsModel.version).label("version"),
                     func.min(TaskFactsModel.ingested_at).label("created_at"))
              .where(TaskFactsModel.user_id == user_id).group_by(TaskFactsModel.id).subquery())
    records = db.execute(select(TaskFactsModel, latest.c.created_at).join(
        latest, (TaskFactsModel.id == latest.c.id) & (TaskFactsModel.version == latest.c.version)
    ).where(TaskFactsModel.user_id == user_id)).all()
    impacts = delay_impacts or {}
    if set(impacts) - {row.id for row, _ in records}:
        raise ValueError("Delay impact supplied for unknown task")
    tasks = []
    for row, created_at in records:
        default_impact = "critical" if row.is_hard_deadline else (
            "significant" if row.importance == "high" else (
                "minor" if row.importance in {"medium", "low"} else "unknown"
            )
        )
        tasks.append(PriorityTask(task={
            "id": row.id,
            "source": {"integration": row.integration, "accountId": row.account_id,
                       "sourceId": row.source_id, "sourceItemKey": row.source_item_key,
                       "sourceUrl": row.source_url, "updatedAt": _aware(row.source_updated_at)},
            "title": row.title, "description": row.description,
            "deadlineAt": _aware(row.deadline_at), "deadlineDate": row.deadline_date,
            "isHardDeadline": row.is_hard_deadline, "estimatedHours": row.estimated_hours,
            "importance": row.importance, "consequencesOfDelay": row.consequences_of_delay,
            "status": row.status, "dependencyIds": row.dependency_ids,
            "evidence": row.evidence, "requiresReview": row.requires_review,
            "ingestedAt": _aware(row.ingested_at),
        }, version=row.version, createdAt=_aware(created_at), delayImpact=impacts.get(row.id, default_impact)))
    request = PriorityRequest(tasks=tasks, context=context)
    result = rank_tasks(request)
    run_id = str(uuid.uuid4())
    snapshot = request.model_dump(mode="json")
    generation = (db.scalar(select(func.max(PriorityRunModel.generation)).where(
        PriorityRunModel.user_id == user_id)) or 0) + 1
    run = PriorityRunModel(
        id=run_id, user_id=user_id, generation=generation, context_snapshot=snapshot,
        calendar_snapshot=calendar_revision(db, user_id),
        engine_version=result.engineVersion, policy_version=result.policyVersion,
    )
    db.add(run)
    db.flush()
    rows = []
    for item in result.rankings:
        row = PriorityAssessmentModel(
            user_id=user_id, run_id=run_id, task_id=item.taskId, task_version=item.taskVersion,
            engine_version=result.engineVersion, policy_version=result.policyVersion,
            rank=item.rank, priority_score=item.priorityScore, priority_bucket=item.priorityBucket,
            tier=item.tier, score_breakdown=item.scoreBreakdown,
            decision_facts=item.decisionFacts + [{"code": "PLANNED_WORK", "blocks": [b.model_dump(mode="json") for b in item.plannedWork],
                                                "projectedCompletionAt": item.projectedCompletionAt.isoformat() if item.projectedCompletionAt else None}],
            warnings=item.warnings,
            generated_at=result.generatedAt, explanation_status="pending",
        )
        db.add(row)
        rows.append(row)
    db.flush()
    apply_batch(run, rows, fallback_batch(explanation_context(run, rows)), status="pending")
    db.flush()
    return run_id, result
