from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
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
    messages, websockets, import_module,
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


@app.middleware("http")
async def add_security_headers_and_logging(request: Request, call_next):
    import time
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    if settings.debug:
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error": str(exc)}
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please contact system administration."}
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
app.include_router(messages.router)
app.include_router(websockets.router)
app.include_router(import_module.router)
from app.routers import audit, hr, parents, academic_planner, library, enterprise, expansion, advanced, digital, tenant
app.include_router(audit.router)
app.include_router(hr.router)
app.include_router(parents.router)
app.include_router(academic_planner.router)
app.include_router(library.router)
app.include_router(enterprise.router)
app.include_router(expansion.router)
app.include_router(advanced.router)
app.include_router(digital.router)
app.include_router(tenant.router)



@app.get("/")
def root():
    return {"name": settings.app_name, "version": settings.app_version,
            "status": "running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
