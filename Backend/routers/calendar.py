from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from Backend.database import get_db
from Backend.models.db_models import CalendarEventModel

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

@router.get("", response_model=List[dict])
def get_calendar_events(db: Session = Depends(get_db)):
    events = db.query(CalendarEventModel).all()
    return [e.to_dict() for e in events]

