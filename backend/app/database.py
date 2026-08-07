from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
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


def _get_target_db_url():
    db_url = settings.database_url
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgresql://") and "+psycopg2" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    # Fix direct Supabase host to use port 6543 if direct 5432 host is configured
    if "supabase.co:5432" in db_url:
        db_url = db_url.replace(":5432", ":6543")

    _is_sqlite = db_url.startswith("sqlite")
    if os.getenv("VERCEL") and _is_sqlite:
        db_url = _setup_tmp_sqlite()
    return db_url


def _create_db_engine(target_url):
    if target_url.startswith("sqlite"):
        return create_engine(
            target_url,
            connect_args={"check_same_thread": False},
            echo=settings.debug,
        )
    return create_engine(
        target_url,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={"connect_timeout": 5},
        echo=settings.debug,
    )


engine = _create_db_engine(_get_target_db_url())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def check_connection():
    global engine, SessionLocal
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        print(f"Primary DB connection failed ({exc}). Falling back to SQLite...")
        try:
            fallback_url = _setup_tmp_sqlite() if os.getenv("VERCEL") else "sqlite:///./student_management.db"
            engine = _create_db_engine(fallback_url)
            SessionLocal.configure(bind=engine)
            create_tables()
            return True
        except Exception as fallback_exc:
            print(f"Fallback DB error: {fallback_exc}")
            return False


def get_db():
    global engine, SessionLocal
    db = None
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        yield db
    except Exception as exc:
        print(f"DB session error: {exc}. Retrying with fallback SQLite DB...")
        if db:
            try:
                db.close()
            except Exception:
                pass
        fallback_url = _setup_tmp_sqlite() if os.getenv("VERCEL") else "sqlite:///./student_management.db"
        engine = _create_db_engine(fallback_url)
        SessionLocal.configure(bind=engine)
        create_tables()
        db = SessionLocal()
        yield db
    finally:
        if db:
            try:
                db.close()
            except Exception:
                pass


def create_tables():
    """Create all tables defined in models and auto-seed if needed."""
    import app.models  # noqa: F401 – ensure all models are imported
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")
    try:
        from app.seed import seed_database
        seed_database()
    except Exception as err:
        print("Auto-seed notice:", err)
