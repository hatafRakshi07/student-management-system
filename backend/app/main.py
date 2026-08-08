import sys
sys.setrecursionlimit(50000)

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
try:
    from app.services.scheduler import start_scheduler, shutdown_scheduler
except Exception:
    start_scheduler = lambda: None
    shutdown_scheduler = lambda: None
from app.routers import (
    auth, students, teachers, parents,
    attendance, assignments, exams, fees, leaves,
    notices, notifications, timetable, ai, analytics,
    messages, websockets, import_module,
)



@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        check_connection()
        create_tables()
    except Exception as err:
        print("Database initialization notice:", err)

    if not os.getenv("VERCEL"):
        for sub in ("photos", "submissions", "assignments"):
            os.makedirs(os.path.join(settings.upload_dir, sub), exist_ok=True)
        try:
            start_scheduler()
        except Exception as e:
            print("Scheduler notice:", e)
    try:
        yield
    finally:
        if not os.getenv("VERCEL"):
            try:
                shutdown_scheduler()
            except Exception:
                pass


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
    allow_origins=["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",
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
    body = {"detail": "Internal Server Error", "error": str(exc)} if settings.debug else {
        "detail": "An internal server error occurred. Please contact system administration.",
        "error": str(exc)
    }
    res = JSONResponse(status_code=500, content=body)
    res.headers["Access-Control-Allow-Origin"] = "*"
    res.headers["Access-Control-Allow-Credentials"] = "true"
    return res


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
from app.routers import audit, hr, parents, academic_planner, library, enterprise, expansion, advanced, digital, tenant, hostel, inventory
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
app.include_router(hostel.router)
app.include_router(inventory.router)



@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"name": settings.app_name, "version": settings.app_version,
            "status": "running", "docs": "/docs"}


@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    from fastapi.responses import Response
    return Response(status_code=204)
