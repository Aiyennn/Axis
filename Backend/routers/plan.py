from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from Backend.database import get_db
from Backend.models.db_models import TaskModel
from Backend.models.schemas import PlanChangeProposalSchema

router = APIRouter(prefix="/api/plan", tags=["plan"])

@router.post("/apply", response_model=List[dict])
def apply_plan(proposal: PlanChangeProposalSchema, db: Session = Depends(get_db)):
    """Applies an approved plan proposal's bucket moves into the PostgreSQL database."""
    for move in proposal.moves:
        task = db.query(TaskModel).filter(TaskModel.id == move.taskId).first()
        if task:
            task.priority_bucket = move.toBucket
    db.commit()

    all_tasks = db.query(TaskModel).all()
    return [t.to_dict() for t in all_tasks]

