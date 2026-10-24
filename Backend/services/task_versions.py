"""Append-only task edits. The caller owns commit/rollback and ranking."""
from sqlalchemy import select
from Backend.models.db_models import TaskFactsModel
from Backend.models.workspace import TaskEdit
from Backend.services.ownership import lock_owner
from Backend.services.errors import TaskNotFound, WorkspaceConflict, InvalidTaskEdit


def revise_task(db, user_id: str, task_id: str, body: TaskEdit):
    """Lock before reading the latest revision to enforce optimistic version checks."""
    lock_owner(db, user_id)
    row = db.scalar(select(TaskFactsModel).where(
        TaskFactsModel.user_id == user_id, TaskFactsModel.id == task_id,
    ).order_by(TaskFactsModel.version.desc()).limit(1))
    if row is None:
        raise TaskNotFound("Task not found")
    if row.version != body.version:
        raise WorkspaceConflict("Task changed. Reload before editing.")
    values = {c.name: getattr(row, c.name) for c in TaskFactsModel.__table__.columns}
    values["version"] += 1
    fields = {"status": "status", "estimatedHours": "estimated_hours", "importance": "importance"}
    evidence = [dict(e) for e in row.evidence]
    for field, column in fields.items():
        if field in body.model_fields_set:
            if field == "status" and body.status is None:
                raise InvalidTaskEdit("Status cannot be null")
            values[column] = getattr(body, field)
            evidence = [e for e in evidence if e["field"] != field]
            evidence.append(dict(field=field, origin="user", needsConfirmation=False))
    if body.confirmEvidence:
        evidence = [{**e, "needsConfirmation": False} for e in evidence]
    values["evidence"] = evidence
    values["requires_review"] = any(e.get("needsConfirmation") for e in evidence)
    db.add(TaskFactsModel(**values))
    db.flush()
