from fastapi import APIRouter

from Backend.models.priority import PriorityRequest, PriorityResult
from Backend.engine import rank_tasks

router = APIRouter(prefix="/api/priority", tags=["priority"])


@router.post("/preview", response_model=PriorityResult)
def preview_priority(request: PriorityRequest):
    """Evaluate submitted facts without reading or writing any user's database."""
    return rank_tasks(request)
