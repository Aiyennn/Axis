from contextlib import asynccontextmanager
import logging
from time import perf_counter
from uuid import uuid4
from Backend.observability import configure_logging, request_id
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Backend.database import engine, Base
from Backend.routers import auth, workspace, priority, integrations, chat
from Backend.services.auth import allowed_origins

configure_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fresh installs only. Existing schemas use the documented migration.
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Axis AI Backend API",
    description="FastAPI service powered by PostgreSQL (Docker) and LLM copilot",
    version="1.0.0",
    lifespan=lifespan
)


@app.middleware("http")
async def log_requests(request, call_next):
    token = request_id.set(uuid4().hex[:12])
    started = perf_counter()
    # Health polling stays quiet; API requests include auth/validation failures.
    tracked = request.url.path.startswith("/api/")
    try:
        if tracked:
            logger.info("request.received method=%s path=%s", request.method, request.url.path)
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id.get()
        if tracked:
            log = logger.warning if response.status_code >= 400 else logger.info
            log("request.completed method=%s path=%s http_status=%s duration_ms=%.0f",
                request.method, request.url.path, response.status_code, (perf_counter() - started) * 1000)
        return response
    except Exception as exc:
        logger.error("request.failed method=%s path=%s error_type=%s duration_ms=%.0f",
                     request.method, request.url.path, type(exc).__name__, (perf_counter() - started) * 1000)
        raise
    finally:
        request_id.reset(token)

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

