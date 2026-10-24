from fastapi import APIRouter, Depends
from Backend.dependencies import chat_service
from Backend.models.schemas import ChatRequest, ChatResponse
from Backend.services.chat import ChatService

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("")
def chat_status(service: ChatService = Depends(chat_service)):
    return service.status()


@router.get("/history", response_model=list[dict])
def get_chat_history(service: ChatService = Depends(chat_service)):
    return service.history()


@router.post("", response_model=ChatResponse)
def post_chat_message(request: ChatRequest, service: ChatService = Depends(chat_service)):
    return service.post(request)
