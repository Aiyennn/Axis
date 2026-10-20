import uuid
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from Backend.database import get_db
from Backend.models.db_models import ChatMessageModel, TaskModel
from Backend.models.schemas import ChatRequest, ChatResponse, TaskSchema
from Backend.services.demo_chat import evaluate_user_prompt

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.get("/history", response_model=List[dict])
def get_chat_history(db: Session = Depends(get_db)):
    msgs = db.query(ChatMessageModel).all()
    return [m.to_dict() for m in msgs]

@router.post("", response_model=ChatResponse)
def post_chat_message(request: ChatRequest, db: Session = Depends(get_db)):
    now_str = datetime.now().strftime("%I:%M %p")

    # Save user message to PostgreSQL
    user_msg_id = f"msg-{uuid.uuid4().hex[:6]}"
    user_msg = ChatMessageModel(
        id=user_msg_id,
        sender="user",
        text=request.message,
        timestamp=now_str,
        proposal=None
    )
    db.add(user_msg)
    db.commit()

    # If tasks are not provided in request body, load them directly from PostgreSQL
    active_tasks = request.tasks
    if not active_tasks:
        db_tasks = db.query(TaskModel).all()
        active_tasks = [TaskSchema(**t.to_dict()) for t in db_tasks]

    # The existing frontend chat uses the seeded demo, not run explanations.
    reply_text, proposal = evaluate_user_prompt(
        request.message,
        active_tasks,
    )

    # Save assistant message + proposal into PostgreSQL
    assistant_msg_id = f"msg-{uuid.uuid4().hex[:6]}"
    proposal_dict = proposal.model_dump() if proposal else None

    assistant_msg = ChatMessageModel(
        id=assistant_msg_id,
        sender="assistant",
        text=reply_text,
        timestamp=now_str,
        proposal=proposal_dict
    )
    db.add(assistant_msg)
    db.commit()

    return ChatResponse(
        reply=reply_text,
        proposal=proposal,
        engine="scripted-demo"
    )

