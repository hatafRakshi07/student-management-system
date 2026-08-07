import sys
sys.setrecursionlimit(50000)

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, configure_mappers
from app.config import settings

import os

Base = declarative_base()

_tables_initialized = False


def _get_database_url() -> str:
    """
    Get and normalize the production Supabase PostgreSQL connection URL.
    Ensures psycopg2 driver and sslmode=require for serverless environments.
    """
    db_url = settings.database_url or ""
    
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgresql://") and "+psycopg2" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    # Ensure sslmode=require for cloud PostgreSQL / Supabase
    if db_url.startswith("postgresql") and "sslmode" not in db_url:
        delimiter = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{delimiter}sslmode=require"

    return db_url


def _init_engine():
    """
    Instantaneous non-blocking SQLAlchemy engine initialization.
    Designed for high-performance serverless cold starts on Vercel.
    """
    db_url = _get_database_url()
    is_sqlite = db_url.startswith("sqlite")
    
    # Serverless engine parameters
    if is_sqlite:
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            echo=settings.debug,
        )

    return create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        future=True,
        connect_args={
            "connect_timeout": 10,
            "sslmode": "require",
        },
        echo=settings.debug,
    )


engine = _init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def check_connection() -> bool:
    """Verify live database connectivity at runtime."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        print("PostgreSQL connection notice:", exc)
        return False


def get_db():
    """FastAPI dependency injection for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """
    Idempotent schema initialization on startup.
    Runs once when lifespan initializes, never per-request.
    """
    global _tables_initialized
    if _tables_initialized:
        return

    import app.models  # noqa: F401 – ensure all models are imported
    try:
        configure_mappers()
    except Exception as map_err:
        print("Mapper notice:", map_err)
    
    try:
        Base.metadata.create_all(bind=engine)
        print("Database schema verified.")
        _tables_initialized = True
        
        try:
            from app.seed import seed_database
            seed_database()
        except Exception as seed_err:
            print("Seed notice:", seed_err)
    except Exception as err:
        print("Schema init notice:", err)
