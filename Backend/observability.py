"""Request-correlated backend logs without prompts, credentials or response bodies."""
import logging
from contextvars import ContextVar

request_id = ContextVar("request_id", default="-")


class RequestFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id.get()
        return True


def configure_logging():
    logger = logging.getLogger("Backend")
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.addFilter(RequestFilter())
        handler.setFormatter(logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s request_id=%(request_id)s %(message)s"
        ))
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
