import sys
sys.setrecursionlimit(50000)

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, configure_mappers
from app.config import settings

import os
import re

Base = declarative_base()

_tables_initialized = False


def _normalize_db_url(url: str) -> str:
    """Normalize Postgres connection URL to psycopg2 dialect."""
    if not url:
        return url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and "+psycopg2" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


def _get_postgres_candidates(primary_url: str) -> list:
    """
    Generate candidate URLs for Supabase PostgreSQL.
    If the direct host (db.<project-ref>.supabase.co:5432) is IPv6-only and fails on
    serverless environments (like AWS Lambda / Vercel iad1), fallback to the Supabase IPv4 Pooler.
    """
    candidates = [_normalize_db_url(primary_url)]

    # Detect Supabase project reference and password from URL
    match = re.search(r"postgresql(?:\+psycopg2)?://([^:]+):([^@]+)@db\.([a-z0-9]+)\.supabase\.co(?::\d+)?/(.+)", primary_url)
    if match:
        user_part, password, project_ref, dbname = match.groups()
        # Clean dbname of query parameters
        dbname_clean = dbname.split("?")[0]
        
        # Supabase Pooler Regions
        regions = [
            "ap-south-1",      # Asia Pacific (Mumbai)
            "us-east-1",       # US East (N. Virginia)
            "ap-southeast-1",  # Asia Pacific (Singapore)
            "eu-central-1",    # Europe (Frankfurt)
            "us-west-1",       # US West (N. California)
            "eu-west-1",       # Europe (Ireland)
            "ap-southeast-2",  # Asia Pacific (Sydney)
            "sa-east-1",       # South America (São Paulo)
        ]
        
        for region in regions:
            # Transaction Pooler (Port 6543) - Recommended for Serverless Functions
            pooler_url_tx = (
                f"postgresql+psycopg2://postgres.{project_ref}:{password}@"
                f"aws-0-{region}.pooler.supabase.com:6543/{dbname_clean}?sslmode=require"
            )
            # Session Pooler (Port 5432)
            pooler_url_sess = (
                f"postgresql+psycopg2://postgres.{project_ref}:{password}@"
                f"aws-0-{region}.pooler.supabase.com:5432/{dbname_clean}?sslmode=require"
            )
            candidates.append(pooler_url_tx)
            candidates.append(pooler_url_sess)

    return candidates


def _init_engine():
    """
    Create a robust production-grade PostgreSQL SQLAlchemy engine.
    Ensures connection to Supabase PostgreSQL without switching to SQLite in production.
    """
    primary_url = settings.database_url
    is_vercel = bool(os.getenv("VERCEL"))
    
    # Generate connection candidates
    candidates = _get_postgres_candidates(primary_url)
    last_error = None

    for candidate_url in candidates:
        if candidate_url.startswith("sqlite"):
            if is_vercel:
                # Production on Vercel MUST NOT use SQLite
                continue
            eng = create_engine(
                candidate_url,
                connect_args={"check_same_thread": False},
                echo=settings.debug,
            )
            return eng

        try:
            eng = create_engine(
                candidate_url,
                pool_pre_ping=True,
                pool_recycle=300,
                pool_size=5,
                max_overflow=10,
                future=True,
                connect_args={
                    "connect_timeout": 5,
                    "sslmode": "require",
                },
                echo=settings.debug,
            )
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            # Mask password in log
            safe_display = re.sub(r":([^@]+)@", ":***@", candidate_url)
            print(f"Successfully connected to PostgreSQL database ({safe_display})")
            return eng
        except Exception as exc:
            last_error = exc
            safe_display = re.sub(r":([^@]+)@", ":***@", candidate_url)
            print(f"PostgreSQL endpoint candidate failed ({safe_display}): {exc}")

    # If all candidates fail on Vercel / Production:
    error_msg = f"FATAL: All PostgreSQL connection attempts failed in production on Vercel. Last error: {last_error}"
    print(error_msg)
    if is_vercel:
        raise RuntimeError(error_msg)
    
    # Fallback to local SQLite only when explicitly in local development (not Vercel)
    print("Local development fallback to SQLite...")
    return create_engine(
        "sqlite:///./student_management.db",
        connect_args={"check_same_thread": False},
        echo=False,
    )


engine = _init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def check_connection() -> bool:
    """Verify live database connectivity."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        print("Database health check failed:", exc)
        return False


def get_db():
    """FastAPI database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """
    Idempotent database schema initialization and seed.
    Runs only once during startup to prevent per-request table overhead.
    """
    global _tables_initialized
    if _tables_initialized:
        return

    import app.models  # noqa: F401 – ensure all models are registered
    try:
        configure_mappers()
    except Exception as map_err:
        print("Mapper configuration notice:", map_err)
    
    try:
        Base.metadata.create_all(bind=engine)
        print("Database schema verified/created successfully.")
        _tables_initialized = True
        
        # Run seed logic
        try:
            from app.seed import seed_database
            seed_database()
        except Exception as seed_err:
            print("Database seed notice:", seed_err)
    except Exception as err:
        print("Database table creation notice:", err)
