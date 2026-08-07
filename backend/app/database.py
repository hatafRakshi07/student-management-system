import sys
sys.setrecursionlimit(50000)

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, configure_mappers
from app.config import settings

import os
import shutil

Base = declarative_base()


def _setup_tmp_sqlite():
    tmp_db_path = "/tmp/student_management.db"
    if not os.path.exists(tmp_db_path) or os.path.getsize(tmp_db_path) == 0:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        candidates = [
            os.path.join(base_dir, "..", "student_management.db"),
            os.path.join(base_dir, "..", "..", "student_management.db"),
            os.path.abspath("student_management.db"),
        ]
        for src in candidates:
            if os.path.exists(src) and os.path.getsize(src) > 0:
                try:
                    shutil.copyfile(src, tmp_db_path)
                    print(f"Vercel: Copied DB from {src} to {tmp_db_path}")
                    break
                except Exception as e:
                    print("Vercel DB copy notice:", e)
    return f"sqlite:///{tmp_db_path}"


def _migrate_sqlite_schema(eng):
    try:
        with eng.begin() as conn:
            res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            cols = [r[1] for r in res] if res else []
            if cols:
                if "username" not in cols:
                    try:
                        conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(100)"))
                    except Exception:
                        pass
                if "phone" not in cols:
                    try:
                        conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
                    except Exception:
                        pass
                if "reset_token" not in cols:
                    try:
                        conn.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)"))
                    except Exception:
                        pass
                if "reset_token_expiry" not in cols:
                    try:
                        conn.execute(text("ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME"))
                    except Exception:
                        pass
                print("SQLite users table schema migrated successfully")
    except Exception as e:
        print("Schema migration notice:", e)


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
        _migrate_sqlite_schema(eng)
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
        _migrate_sqlite_schema(eng)
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
        _migrate_sqlite_schema(engine)
        print("Database tables created.")
        if not os.getenv("VERCEL"):
            from app.seed import seed_database
            seed_database()
    except Exception as err:
        print("Auto-seed notice:", err)
