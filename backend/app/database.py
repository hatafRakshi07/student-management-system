import sys
sys.setrecursionlimit(50000)

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, configure_mappers
from app.config import settings

import os

Base = declarative_base()


def _setup_tmp_sqlite():
    return "sqlite:////tmp/student_management.db"


def _init_engine():
    db_url = settings.database_url
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgresql://") and "+psycopg2" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    if "supabase.co" in db_url and ":5432" in db_url:
        db_url = db_url.replace(":5432", ":6543")

    _is_sqlite = db_url.startswith("sqlite")
    if os.getenv("VERCEL") and _is_sqlite:
        db_url = _setup_tmp_sqlite()

    if _is_sqlite:
        print(f"Using SQLite database: {db_url}")
        eng = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            echo=False,
        )
        try:
            import app.models  # noqa: F401
            Base.metadata.create_all(bind=eng)
            from app.seed import seed_database
            seed_database()
        except Exception as e:
            print("SQLite init notice:", e)
        return eng

    # For PostgreSQL / Supabase, attempt connection test with 2s timeout
    try:
        test_eng = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={"connect_timeout": 2},
            echo=False,
        )
        with test_eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Connected to PostgreSQL database cleanly")
        return test_eng
    except Exception as exc:
        print(f"PostgreSQL connection failed ({exc}). Falling back to SQLite database...")
        fallback_url = _setup_tmp_sqlite() if os.getenv("VERCEL") else "sqlite:///./student_management.db"
        eng = create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
            echo=False,
        )
        try:
            import app.models  # noqa: F401
            Base.metadata.create_all(bind=eng)
            from app.seed import seed_database
            seed_database()
        except Exception as seed_err:
            print("Fallback DB seed notice:", seed_err)
        return eng


engine = _init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def check_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables defined in models and auto-seed if needed."""
    import app.models  # noqa: F401 – ensure all models are imported
    try:
        configure_mappers()
    except Exception as map_err:
        print("Mapper configuration notice:", map_err)
    try:
        Base.metadata.create_all(bind=engine)
        from app.seed import seed_database
        seed_database()
    except Exception as err:
        print("Auto-seed notice:", err)
