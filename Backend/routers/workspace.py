import os
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy import select

from Backend.database import SessionLocal
from Backend.models.db_models import TaskFactsModel
from Backend.models.integrations import IngestionModel
from Backend.ingestion.pipeline import preview_import, load_fixtures
from Backend.ingestion.extraction import GeminiExtractor
from Backend.ingestion.store import persist_import
from Backend.services.auth import current_user
from Backend.services.ownership import lock_owner
from Backend.services.workspace import rank_workspace, finish_run, workspace_view

router = APIRouter(prefix="/api/workspace", tags=["workspace"])


def session_factory():
    return SessionLocal


@router.get("")
def read_workspace(user=Depends(current_user), factory=Depends(session_factory)):
    with factory() as db:
        return workspace_view(db, user.id)


class MockSyncRequest(IngestionModel):
    integrations: list[Literal["canvas", "google_calendar", "gmail", "github", "notion", "manual"]] = Field(min_length=1, max_length=6)


@router.post("/sync-mock")
def sync_mock(body: MockSyncRequest | None = None, user=Depends(current_user), factory=Depends(session_factory)):
    extractor = GeminiExtractor() if os.getenv("EXTRACTION_MODE", "fixture") == "gemini" else None
    envelopes = None if body is None else [
        envelope for envelope in load_fixtures() if envelope["integration"] in body.integrations
    ]
    preview = preview_import(envelopes, user_id=user.id, extractor=extractor)
    with factory.begin() as db:
        counts = persist_import(db, user_id=user.id, preview=preview)
        run_id = rank_workspace(db, user.id)
    return {**finish_run(factory, user.id, run_id),
            "importResult": {**counts, "issues": preview.issues, "mode": preview.extractionMode}}


@router.post("/refresh")
def refresh(user=Depends(current_user), factory=Depends(session_factory)):
    with factory.begin() as db:
        run_id = rank_workspace(db, user.id)
    return finish_run(factory, user.id, run_id)


class TaskEdit(IngestionModel):
    version: int = Field(ge=1)
    status: Literal["pending", "completed"] | None = None
    estimatedHours: float | None = Field(default=None, gt=0, le=10000, allow_inf_nan=False)
    importance: Literal["high", "medium", "low"] | None = None
    confirmEvidence: bool = False


@router.patch("/tasks/{task_id}")
def edit_task(task_id: str, body: TaskEdit, user=Depends(current_user), factory=Depends(session_factory)):
    with factory.begin() as db:
        lock_owner(db, user.id)
        row = db.scalar(select(TaskFactsModel).where(
            TaskFactsModel.user_id == user.id, TaskFactsModel.id == task_id,
        ).order_by(TaskFactsModel.version.desc()).limit(1))
        if row is None:
            raise HTTPException(404, "Task not found")
        if row.version != body.version:
            raise HTTPException(409, "Task changed. Reload before editing.")
        values = {c.name: getattr(row, c.name) for c in TaskFactsModel.__table__.columns}
        values["version"] += 1
        fields = {"status": "status", "estimatedHours": "estimated_hours", "importance": "importance"}
        evidence = [dict(e) for e in row.evidence]
        for field, column in fields.items():
            if field in body.model_fields_set:
                if field == "status" and body.status is None:
                    raise HTTPException(422, "Status cannot be null")
                values[column] = getattr(body, field)
                evidence = [e for e in evidence if e["field"] != field]
                evidence.append(dict(field=field, origin="user", needsConfirmation=False))
        if body.confirmEvidence:
            evidence = [{**e, "needsConfirmation": False} for e in evidence]
        values["evidence"] = evidence
        values["requires_review"] = any(e.get("needsConfirmation") for e in evidence)
        db.add(TaskFactsModel(**values))
        db.flush()
        run_id = rank_workspace(db, user.id)
    return finish_run(factory, user.id, run_id)
