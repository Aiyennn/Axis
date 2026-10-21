"""Deprecated: Scripted demo chat logic removed per architectural update."""
from typing import Tuple, Optional
from Backend.models.schemas import TaskSchema, PlanChangeProposalSchema

FALLBACK_MESSAGE = "Oops Axis is not available at the moment please try again later"

def evaluate_user_prompt(
    user_message: str,
    tasks: list[TaskSchema],
) -> Tuple[str, Optional[PlanChangeProposalSchema]]:
    """Return fallback offline message."""
    return FALLBACK_MESSAGE, None
