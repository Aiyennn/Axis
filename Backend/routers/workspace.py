from fastapi import APIRouter, Depends

from Backend.dependencies import workspace_service
from Backend.models.workspace import MockSyncRequest, TaskEdit
from Backend.models.schemas import PlanChangeProposalSchema
from Backend.dependencies import current_user
from Backend.services.workspace import WorkspaceService

router = APIRouter(prefix="/api/workspace", tags=["workspace"])


@router.post('/plan')
def apply_plan(body: PlanChangeProposalSchema, user=Depends(current_user),
               service: WorkspaceService = Depends(workspace_service)):
    return service.apply_plan(user.id, body)


@router.get("")
def read_workspace(user=Depends(current_user), service: WorkspaceService = Depends(workspace_service)):
    return service.read(user.id)


@router.post("/briefing/retry")
def retry_briefing(user=Depends(current_user), service: WorkspaceService = Depends(workspace_service)):
    return service.retry_briefing(user.id)


@router.post("/sync-mock")
def sync_mock(body: MockSyncRequest | None = None, user=Depends(current_user),
              service: WorkspaceService = Depends(workspace_service)):
    return service.sync_mock(user.id, body)


@router.post("/refresh")
def refresh(user=Depends(current_user), service: WorkspaceService = Depends(workspace_service)):
    return service.refresh(user.id)


@router.patch("/tasks/{task_id}")
def edit_task(task_id: str, body: TaskEdit, user=Depends(current_user),
              service: WorkspaceService = Depends(workspace_service)):
    return service.edit_task(user.id, task_id, body)
