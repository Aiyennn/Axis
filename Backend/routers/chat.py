import os
import uuid
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from Backend.database import get_db
from Backend.models.db_models import ChatMessageModel
from Backend.models.schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

FALLBACK_MESSAGE = "Oops Axis is not available at the moment please try again later"


def get_val(item, key, default=""):
    if isinstance(item, dict):
        val = item.get(key)
        return val if val is not None else default
    val = getattr(item, key, None)
    return val if val is not None else default


@router.get("")
def chat_status():
    raw_key = os.getenv("GEMINI_API_KEY")
    key = raw_key.strip("'\" \t\r\n") if raw_key else None
    raw_model = os.getenv("GEMINI_CHAT_MODEL") or os.getenv("GEMINI_MODEL")
    model_name = raw_model.strip("'\" \t\r\n") if raw_model else None
    return {
        "status": "online",
        "llm_embedded": bool(key and model_name),
        "model": model_name if key and model_name else None,
        "message": "Send a POST request with {'message': 'your question'} to chat with Axis."
    }


@router.get("/history", response_model=List[dict])
def get_chat_history(db: Session = Depends(get_db)):
    msgs = db.query(ChatMessageModel).all()
    return [m.to_dict() for m in msgs]


@router.post("", response_model=ChatResponse)
def post_chat_message(request: ChatRequest, db: Session = Depends(get_db)):
    now_str = datetime.now().strftime("%I:%M %p")

    # Persist user message
    user_msg_id = f"msg-{uuid.uuid4().hex[:6]}"
    user_msg = ChatMessageModel(
        id=user_msg_id,
        sender="user",
        text=request.message,
        timestamp=now_str,
        proposal=None,
    )
    db.add(user_msg)
    try:
        db.commit()
    except Exception:
        db.rollback()

    raw_key = os.getenv("GEMINI_API_KEY")
    key = raw_key.strip("'\" \t\r\n") if raw_key else None
    raw_model = os.getenv("GEMINI_CHAT_MODEL") or os.getenv("GEMINI_MODEL")
    model_name = raw_model.strip("'\" \t\r\n") if raw_model else None

    # If no LLM is embedded or configured, respond with fallback message immediately
    if not key or not model_name:
        reply_text = FALLBACK_MESSAGE
        engine_mode = "offline"
    else:
        try:
            from google import genai
            from google.genai import types

            # Format real task context from the request if provided
            task_lines = []
            for t in (request.tasks or [])[:12]:
                title = get_val(t, "title", "Task")
                bucket = get_val(t, "priorityBucket") or get_val(t, "tier", "normal")
                deadline = get_val(t, "deadline") or get_val(t, "deadlineAt", "No deadline")
                effort = get_val(t, "estimatedHours", None)
                effort_str = f"{effort}h" if effort else "unknown effort"
                reasoning = get_val(t, "reasoning", "")
                task_lines.append(f"- {title} [{str(bucket).upper()}]: deadline={deadline}, effort={effort_str}. {reasoning}")

            task_context = "\n".join(task_lines) if task_lines else "No tasks currently loaded in workspace."

            system_instruction = (
                "You are Axis Copilot, an AI assistant for a student and freelancer productivity system. "
                "You provide clear, direct advice on priorities, task trade-offs, and deadlines based on their actual tasks. "
                "Keep responses concise (2-4 sentences) and grounded in the provided tasks. "
                "Never invent tasks or deadlines not present in the context."
            )

            prompt_content = f"Active Workspace Tasks:\n{task_context}\n\nUser Question:\n{request.message}"

            with genai.Client(api_key=key, http_options=types.HttpOptions(timeout=15000)) as client:
                res = client.models.generate_content(
                    model=model_name,
                    contents=prompt_content,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        max_output_tokens=1024,
                    ),
                )
                reply_text = res.text.strip() if res.text else FALLBACK_MESSAGE
                engine_mode = "gemini"
        except Exception as e:
            logger.error("Gemini generation failed: %s", e)
            reply_text = FALLBACK_MESSAGE
            engine_mode = "offline"

    # Persist assistant reply
    assistant_msg_id = f"msg-{uuid.uuid4().hex[:6]}"
    assistant_msg = ChatMessageModel(
        id=assistant_msg_id,
        sender="assistant",
        text=reply_text,
        timestamp=now_str,
        proposal=None,
    )
    db.add(assistant_msg)
    try:
        db.commit()
    except Exception:
        db.rollback()

    return ChatResponse(
        reply=reply_text,
        proposal=None,
        engine=engine_mode,
    )
