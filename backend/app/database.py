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
    Generate fast candidate URLs for Supabase PostgreSQL (Direct + IPv4 Pooler).
    """
    candidates = [_normalize_db_url(primary_url)]

    match = re.search(r"postgresql(?:\+psycopg2)?://([^:]+):([^@]+)@db\.([a-z0-9]+)\.supabase\.co(?::\d+)?/(.+)", primary_url)
    if match:
        user_part, password, project_ref, dbname = match.groups()
        dbname_clean = dbname.split("?")[0]
        
        # Primary Supabase Pooler Regions (India & US East)
        for region in ["ap-south-1", "us-east-1", "ap-southeast-1"]:
            pooler_url_tx = (
                f"postgresql+psycopg2://postgres.{project_ref}:{password}@"
                f"aws-0-{region}.pooler.supabase.com:6543/{dbname_clean}?sslmode=require"
            )
            pooler_url_sess = (
                f"postgresql+psycopg2://postgres.{project_ref}:{password}@"
                f"aws-0-{region}.pooler.supabase.com:5432/{dbname_clean}?sslmode=require"
            )
            candidates.append(pooler_url_tx)
            candidates.append(pooler_url_sess)

    return candidates


def _init_engine():
    """
    Create a robust production-grade PostgreSQL SQLAlchemy engine for Serverless Vercel.
    Quickly resolves live Supabase connection within 2 seconds.
    """
    primary_url = settings.database_url
    candidates = _get_postgres_candidates(primary_url)
    
    selected_url = candidates[0]
    
    for candidate_url in candidates:
        if candidate_url.startswith("sqlite"):
            continue
        try:
            test_eng = create_engine(
                candidate_url,
                pool_pre_ping=True,
                pool_recycle=300,
                pool_size=5,
                max_overflow=10,
                future=True,
                connect_args={
                    "connect_timeout": 2,
                    "sslmode": "require",
                },
                echo=False,
            )
            with test_eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            safe_display = re.sub(r":([^@]+)@", ":***@", candidate_url)
            print(f"Successfully verified PostgreSQL connection ({safe_display})")
            return test_eng
        except Exception as exc:
            safe_display = re.sub(r":([^@]+)@", ":***@", candidate_url)
            print(f"Candidate ({safe_display}) check notice: {exc}")

    # Fallback to creating engine with primary PostgreSQL URL
    print(f"Initializing standard PostgreSQL engine for {selected_url.split('@')[-1]}")
    return create_engine(
        selected_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        future=True,
        connect_args={
            "connect_timeout": 10,
            "sslmode": "require",
        } if not selected_url.startswith("sqlite") else {"check_same_thread": False},
        echo=settings.debug,
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
        
        try:
            from app.seed import seed_database
            seed_database()
        except Exception as seed_err:
            print("Database seed notice:", seed_err)
    except Exception as err:
        print("Database table creation notice:", err)
