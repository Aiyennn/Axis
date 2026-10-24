"""Chat workflow. Each message commits separately, outside provider calls."""
import logging
import uuid
from datetime import datetime
from time import perf_counter
from sqlalchemy import select
from Backend.models.db_models import ChatMessageModel
from Backend.models.schemas import ChatResponse
from Backend.services.chat_provider import FALLBACK_MESSAGE
from Backend.observability import log_stage

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self, factory, settings, provider=None):
        self.factory = factory
        self.settings = settings
        self.provider = provider

    def status(self):
        return {
            "status": "online", "llm_embedded": self.settings.configured,
            "model": self.settings.model if self.settings.configured else None,
            "message": "Send a POST request with {'message': 'your question'} to chat with Axis.",
        }

    def history(self):
        with self.factory() as db:
            return [message.to_dict() for message in db.scalars(select(ChatMessageModel))]

    def _save_message(self, sender, text, timestamp):
        # Preserve best-effort saves: either failure must not prevent a reply.
        try:
            with log_stage(logger, f"chat.database.save_{sender}"), self.factory.begin() as db:
                db.add(ChatMessageModel(id=f"msg-{uuid.uuid4().hex[:6]}", sender=sender,
                                        text=text, timestamp=timestamp, proposal=None))
        except Exception as exc:
            logger.error("chat.%s_message.save_failed error_type=%s", sender, type(exc).__name__)

    def post(self, request):
        started = perf_counter()
        logger.info("chat.received tasks=%s", len(request.tasks or []))
        timestamp = datetime.now().strftime("%I:%M %p")
        self._save_message("user", request.message, timestamp)
        reply, engine = FALLBACK_MESSAGE, "offline"
        if not self.settings.configured:
            logger.warning("chat.fallback reason=missing_configuration key_present=%s model_present=%s",
                           bool(self.settings.api_key), bool(self.settings.model))
        else:
            provider_started = perf_counter()
            try:
                with log_stage(logger, "chat.gemini.generate", model=self.settings.model):
                    reply = self.provider.generate(request)
                engine = "gemini"
                if reply == FALLBACK_MESSAGE:
                    logger.warning("chat.provider.empty_response model=%s fallback=true", self.settings.model)
                else:
                    logger.info("chat.provider.succeeded model=%s duration_ms=%.0f",
                                self.settings.model, (perf_counter() - provider_started) * 1000)
            except Exception as exc:
                logger.error("chat.provider.failed model=%s error_type=%s provider_code=%s provider_status=%s fallback=true duration_ms=%.0f",
                             self.settings.model, type(exc).__name__, getattr(exc, "code", None), getattr(exc, "status", None),
                             (perf_counter() - provider_started) * 1000)
        self._save_message("assistant", reply, timestamp)
        logger.info("chat.completed engine=%s fallback=%s duration_ms=%.0f", engine,
                    reply == FALLBACK_MESSAGE, (perf_counter() - started) * 1000)
        return ChatResponse(reply=reply, proposal=None, engine=engine)
