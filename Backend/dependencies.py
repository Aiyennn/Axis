"""FastAPI composition and request authentication."""
import logging
from Backend.observability import log_stage
from fastapi import Depends, HTTPException, Request, Response
from Backend.database import SessionLocal
from Backend.config import (
    WorkspaceSettings, workspace_settings, AuthSettings, auth_settings,
    COOKIE, SESSION_SECONDS, ChatSettings, chat_settings,
)
from Backend.services.auth import AuthService, LoginLimiter
from Backend.services.chat import ChatService
from Backend.services.chat_provider import GeminiChatProvider
from Backend.services.workspace import WorkspaceService

_limiter = LoginLimiter()
logger = logging.getLogger(__name__)


def session_factory():
    return SessionLocal


def workspace_service(factory=Depends(session_factory),
                      settings: WorkspaceSettings = Depends(workspace_settings)) -> WorkspaceService:
    return WorkspaceService(factory, settings)


def auth_service(factory=Depends(session_factory)) -> AuthService:
    return AuthService(factory)


def login_limiter():
    return _limiter


def check_origin(request: Request, settings: AuthSettings = Depends(auth_settings)):
    if request.method in {"POST", "PATCH", "PUT", "DELETE"}:
        origin = request.headers.get("origin")
        if origin and origin not in settings.origins:
            raise HTTPException(403, "Untrusted origin")
        if request.headers.get("x-axis-request") != "1":
            raise HTTPException(403, "Missing request header")


def throttle(request: Request, limiter: LoginLimiter = Depends(login_limiter)):
    limiter.check(request.client.host if request.client else "unknown")


def current_user(request: Request, service: AuthService = Depends(auth_service),
                 origin=Depends(check_origin)):
    with log_stage(logger, "auth.session_lookup"):
        return service.authenticate(request.cookies.get(COOKIE))


def set_session_cookie(response: Response, token: str, settings: AuthSettings):
    response.set_cookie(COOKIE, token, httponly=True, samesite="lax",
                        secure=settings.cookie_secure, max_age=SESSION_SECONDS, path="/")


def chat_provider(settings: ChatSettings = Depends(chat_settings)):
    return GeminiChatProvider(settings) if settings.configured else None


def chat_service(factory=Depends(session_factory), settings: ChatSettings = Depends(chat_settings),
                 provider=Depends(chat_provider)) -> ChatService:
    return ChatService(factory, settings, provider)
