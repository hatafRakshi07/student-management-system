from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
import os

from app.database import create_tables, check_connection
from app.config import settings
from app.utils.rate_limit import limiter
from app.services.scheduler import start_scheduler, shutdown_scheduler
from app.routers import (
    auth, students, teachers, parents,
    attendance, assignments, exams, fees, leaves,
    notices, notifications, timetable, ai, analytics,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    check_connection()
    create_tables()
    for sub in ("photos", "submissions", "assignments"):
        os.makedirs(os.path.join(settings.upload_dir, sub), exist_ok=True)
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-Based Student Management System API",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.exists(settings.upload_dir):
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(teachers.router)
app.include_router(parents.router)
app.include_router(attendance.router)
app.include_router(assignments.router)
app.include_router(exams.router)
app.include_router(fees.router)
app.include_router(leaves.router)
app.include_router(notices.router)
app.include_router(notifications.router)
app.include_router(timetable.router)
app.include_router(ai.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {"name": settings.app_name, "version": settings.app_version,
            "status": "running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
