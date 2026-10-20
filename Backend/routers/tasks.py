from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from Backend.database import get_db
from Backend.models.db_models import TaskModel
from Backend.services.seeder import seed_database
import uuid

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

@router.get("", response_model=List[dict])
def get_all_tasks(db: Session = Depends(get_db)):
    tasks = db.query(TaskModel).all()
    return [t.to_dict() for t in tasks]

@router.post("", response_model=dict)
def create_task(task_in: dict, db: Session = Depends(get_db)):
    task_id = task_in.get("id") or f"task-{uuid.uuid4().hex[:6]}"
    new_task = TaskModel(
        id=task_id,
        title=task_in.get("title", "Untitled Task"),
        description=task_in.get("description", ""),
        source=task_in.get("source", "task"),
        source_label=task_in.get("sourceLabel", "Personal Task"),
        deadline=task_in.get("deadline", "Tomorrow, 5:00 PM"),
        is_hard_deadline=task_in.get("isHardDeadline", False),
        estimated_hours=float(task_in.get("estimatedHours", 1.0)),
        importance=task_in.get("importance", "medium"),
        status="pending",
        priority_score=int(task_in.get("priorityScore", 50)),
        priority_bucket=task_in.get("priorityBucket", "next"),
        reasoning=task_in.get("reasoning", "Created in Axis integrations hub."),
        consequences_of_delay=task_in.get("consequencesOfDelay", "None noted."),
        score_breakdown=task_in.get("scoreBreakdown", {
            "deadlineProximity": 15,
            "consequenceWeight": 15,
            "calendarFit": 10,
            "importanceScore": 10
        })
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task.to_dict()

@router.patch("/{task_id}/toggle", response_model=dict)
def toggle_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = "completed" if task.status == "pending" else "pending"
    db.commit()
    db.refresh(task)
    return task.to_dict()

@router.patch("/{task_id}/bucket", response_model=dict)
def update_task_bucket(task_id: str, bucket_data: dict, db: Session = Depends(get_db)):
    task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    new_bucket = bucket_data.get("bucket")
    if new_bucket in ["now", "next", "later"]:
        task.priority_bucket = new_bucket
        db.commit()
        db.refresh(task)
    return task.to_dict()

@router.post("/reset", response_model=List[dict])
def reset_tasks(db: Session = Depends(get_db)):
    seed_database(db, force=True)
    tasks = db.query(TaskModel).all()
    return [t.to_dict() for t in tasks]

