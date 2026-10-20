from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Backend.database import engine, Base, SessionLocal
from Backend.services.seeder import seed_database
from Backend.routers import tasks, calendar, chat, plan, priority, integrations

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize PostgreSQL tables and seed demo scenario
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(tasks.router)
app.include_router(calendar.router)
app.include_router(chat.router)
app.include_router(plan.router)
app.include_router(priority.router)
app.include_router(integrations.router)

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
    return {"status": "healthy", "database": "connected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Backend.main:app", host="0.0.0.0", port=8000, reload=True)

