"""Application configuration, captured once per operation."""
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class WorkspaceSettings:
    extraction_mode: str = "fixture"
    explanation_mode: str = "rules"

    @property
    def ai_briefings_enabled(self) -> bool:
        return self.explanation_mode == "gemini"


def workspace_settings() -> WorkspaceSettings:
    return WorkspaceSettings(
        extraction_mode=os.getenv("EXTRACTION_MODE", "fixture"),
        explanation_mode=os.getenv("EXPLANATION_MODE", "rules"),
    )


COOKIE = "axis_session"
SESSION_SECONDS = 60 * 60 * 24 * 7


@dataclass(frozen=True)
class AuthSettings:
    origins: tuple[str, ...] = ("http://localhost:5173", "http://127.0.0.1:5173")
    cookie_secure: bool = False


def auth_settings() -> AuthSettings:
    return AuthSettings(
        origins=tuple(os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")),
        cookie_secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
    )


def allowed_origins():
    return list(auth_settings().origins)


@dataclass(frozen=True)
class ChatSettings:
    api_key: str | None = None
    model: str | None = None

    @property
    def configured(self):
        return bool(self.api_key and self.model)


def chat_settings() -> ChatSettings:
    def clean(value):
        return value.strip("'\" \t\r\n") if value else None
    return ChatSettings(clean(os.getenv("GEMINI_API_KEY")),
                        clean(os.getenv("GEMINI_CHAT_MODEL") or os.getenv("GEMINI_MODEL")))
