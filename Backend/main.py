from contextlib import asynccontextmanager
import logging
from time import perf_counter
from uuid import uuid4
from Backend.observability import configure_logging, request_id, request_route, request_started, log_stage
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from Backend.services.errors import (
    ApplicationError, TaskNotFound, WorkspaceConflict, InvalidTaskEdit, BriefingUnavailable,
    AccountConflict, InvalidCredentials, SignInRequired, TooManyAttempts,
)
from fastapi.middleware.cors import CORSMiddleware
from Backend.database import engine, Base
from Backend.routers import auth, workspace, priority, integrations, chat
from Backend.config import allowed_origins

configure_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fresh installs only. Existing schemas use the documented migration.
    with log_stage(logger, "startup.database", operation="initialize_schema"):
        Base.metadata.create_all(bind=engine)
    logger.info("startup.ready")
    yield

app = FastAPI(
    title="Axis AI Backend API",
    description="FastAPI service powered by PostgreSQL (Docker) and LLM copilot",
    version="1.0.0",
    lifespan=lifespan
)


# Keep application services independent of HTTP semantics.
@app.exception_handler(ApplicationError)
async def application_error(request, exc):
    status = {TaskNotFound: 404, WorkspaceConflict: 409,
              InvalidTaskEdit: 422, BriefingUnavailable: 503, AccountConflict: 409,
              InvalidCredentials: 401, SignInRequired: 401, TooManyAttempts: 429}[type(exc)]
    return JSONResponse(status_code=status, content={"detail": str(exc)})


@app.middleware("http")
async def log_requests(request, call_next):
    token = request_id.set(uuid4().hex[:12])
    started = perf_counter()
    route_token = request_route.set(f"{request.method} {request.url.path}")
    started_token = request_started.set(started)
    # Health polling stays quiet; API requests include auth/validation failures.
    tracked = request.url.path.startswith("/api/")
    try:
        if tracked:
            logger.info("request.received", extra={"stage_name": "request", "stage_state": "START"})
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id.get()
        if tracked:
            log = logger.warning if response.status_code >= 400 else logger.info
            log("request.completed method=%s path=%s http_status=%s duration_ms=%.0f",
                request.method, request.url.path, response.status_code, (perf_counter() - started) * 1000,
                extra={"stage_name": "request", "stage_state": "DONE"})
        return response
    except Exception as exc:
        logger.error("request.failed method=%s path=%s error_type=%s duration_ms=%.0f",
                     request.method, request.url.path, type(exc).__name__, (perf_counter() - started) * 1000,
                     extra={"stage_name": "request", "stage_state": "FAIL"})
        raise
    finally:
        request_id.reset(token)
        request_route.reset(route_token)
        request_started.reset(started_token)

# CORS setup for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router)
app.include_router(workspace.router)
app.include_router(priority.router)
app.include_router(integrations.router)
app.include_router(chat.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Axis AI Backend",
        "database": "PostgreSQL (Docker)",
        "engine": "FastAPI + LLM"
    }

@app.get("/health")
def health_check():
    from sqlalchemy import text
    from fastapi import HTTPException
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(503, "Database unavailable")
    return {"status": "healthy", "database": "connected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Backend.main:app", host="0.0.0.0", port=8000, reload=True)

