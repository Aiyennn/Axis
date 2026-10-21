from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Backend.database import engine, Base
from Backend.routers import auth, workspace, priority, integrations, chat
from Backend.services.auth import allowed_origins

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

