"""Persist validated outputs; fixture files remain the replay source."""
import hashlib
import json

from sqlalchemy import select, delete
from Backend.models.db_models import TaskFactsModel, CalendarSourceModel, utc_now
from Backend.services.ownership import lock_owner
from .pipeline import ImportPreview


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def persist_import(db, *, user_id: str, preview: ImportPreview, reset: bool = False):
    """Caller owns the transaction. Serialize writes per user on PostgreSQL.

    Extraction is performed before this function, outside the DB transaction.
    Replays compare accepted facts plus source content, excluding fetch time.
    """
    if preview.ownerId != user_id:
        raise ValueError("Preview belongs to a different user")
    lock_owner(db, user_id)
    if reset:
        # Keep historical revisions referenced by prior priority runs intact.
        imported_ids = {task.id for task in preview.tasks}
        latest = {}
        for row in db.scalars(select(TaskFactsModel).where(
            TaskFactsModel.user_id == user_id,
        ).order_by(TaskFactsModel.version.desc())):
            latest.setdefault(row.id, row)
        for row in latest.values():
            if row.id not in imported_ids and row.status != 'cancelled':
                values = {c.name: getattr(row, c.name) for c in TaskFactsModel.__table__.columns}
                values.update(version=row.version + 1, status='cancelled')
                db.add(TaskFactsModel(**values))
        db.execute(delete(CalendarSourceModel).where(CalendarSourceModel.user_id == user_id))
        db.flush()
    counts = {"created": 0, "revised": 0, "unchanged": 0, "calendarUpdated": 0}
    for task in preview.tasks:
        snapshot = dict(preview.snapshots[task.id])
        comparable = task.model_dump(mode="json", exclude={"ingestedAt"})
        digest = fingerprint({"task": comparable, "snapshot": snapshot})
        existing = db.execute(select(TaskFactsModel).where(
            TaskFactsModel.user_id == user_id, TaskFactsModel.id == task.id,
        ).order_by(TaskFactsModel.version.desc()).limit(1)).scalar_one_or_none()
        if not reset and existing and (existing.source_snapshot or {}).get("ingestionFingerprint") == digest:
            counts["unchanged"] += 1
            continue
        snapshot["ingestionFingerprint"] = digest
        db.add(TaskFactsModel.from_normalized(
            task, user_id=user_id, version=existing.version + 1 if existing else 1,
            source_snapshot=snapshot,
        ))
        db.flush()
        counts["revised" if existing else "created"] += 1
    for record in preview.calendarEvents:
        identity = (user_id, record.accountId, record.sourceId)
        payload = record.model_dump(mode="json")
        digest = fingerprint(record.model_dump(mode="json", exclude={"fetchedAt"}))
        existing = db.get(CalendarSourceModel, identity)
        if existing and existing.content_hash == digest:
            continue
        if existing is None:
            existing = CalendarSourceModel(user_id=user_id, account_id=record.accountId, source_id=record.sourceId)
            db.add(existing)
        existing.record, existing.content_hash = payload, digest
        existing.updated_at = utc_now()
        counts["calendarUpdated"] += 1
        db.flush()
    return counts
