"""Request-correlated backend logs without prompts, credentials or response bodies."""
import logging
from contextlib import contextmanager
from contextvars import ContextVar, copy_context
from threading import Event, Thread
from time import perf_counter

request_id = ContextVar("request_id", default="-")
request_route = ContextVar("request_route", default="background")
request_started = ContextVar("request_started", default=None)


class RequestFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id.get()
        record.request_route = request_route.get()
        started = request_started.get()
        record.request_elapsed = f"+{perf_counter() - started:.3f}s" if started is not None else "-"
        return True


class ReadableFormatter(logging.Formatter):
    """Keep existing event names searchable, but separate their fields visually."""

    def format(self, record):
        message = record.getMessage().replace("\r", "\\r").replace("\n", "\\n")
        event, _, details = message.partition(" ")
        stage = getattr(record, "stage_name", event)
        inferred = {"started": "START", "received": "START", "completed": "DONE",
                    "succeeded": "DONE", "saved": "DONE", "loaded": "DONE",
                    "failed": "FAIL", "save_failed": "FAIL", "fallback": "FALLBACK",
                    "skipped": "SKIP"}.get(event.rsplit(".", 1)[-1], "EVENT")
        state = getattr(record, "stage_state", inferred)
        timestamp = self.formatTime(record, "%H:%M:%S") + f".{int(record.msecs):03d}"
        return (f"{timestamp} | {record.levelname:<7} | req={getattr(record, 'request_id', '-')} "
                f"| {getattr(record, 'request_route', 'background')} "
                f"| {getattr(record, 'request_elapsed', '-'):>10} "
                f"| {state:<5} | {stage}" + (f" | {details}" if details else ""))


@contextmanager
def log_stage(logger, name, *, wait_seconds=5, **fields):
    """Time one operation and report continued waits without logging its data."""
    started = perf_counter()
    stopped = Event()
    details = " ".join(f"{key}={value}" for key, value in fields.items())

    def emit(state, level=logging.INFO, **extra_fields):
        extra_details = " ".join(f"{key}={value}" for key, value in extra_fields.items())
        message = " ".join(part for part in (name, details,
                           f"elapsed_s={perf_counter() - started:.3f}", extra_details) if part)
        logger.log(level, "%s", message,
                   extra={"stage_name": name, "stage_state": state})

    def waiting():
        while not stopped.wait(wait_seconds):
            emit("WAIT", logging.WARNING)

    emit("START")
    context = copy_context()
    worker = Thread(target=context.run, args=(waiting,), daemon=True, name="request-log-wait")
    worker.start()
    try:
        yield
    except BaseException as exc:
        stopped.set()
        worker.join(timeout=0.2)
        emit("FAIL", logging.ERROR, error_type=type(exc).__name__,
             error_code=getattr(exc, "code", None))
        raise
    else:
        stopped.set()
        worker.join(timeout=0.2)
        emit("DONE")


def configure_logging():
    logger = logging.getLogger("Backend")
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.addFilter(RequestFilter())
        handler.setFormatter(ReadableFormatter())
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
