from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

import os
import shutil

db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://") and "+psycopg2" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

_is_sqlite = db_url.startswith("sqlite")

if os.getenv("VERCEL") and _is_sqlite:
    tmp_db_path = "/tmp/student_management.db"
    if not os.path.exists(tmp_db_path) or os.path.getsize(tmp_db_path) == 0:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        candidates = [
            os.path.join(base_dir, "..", "student_management.db"),
            os.path.join(base_dir, "..", "..", "student_management.db"),
            os.path.abspath("student_management.db"),
        ]
        copied = False
        for src in candidates:
            if os.path.exists(src) and os.path.getsize(src) > 0:
                try:
                    shutil.copyfile(src, tmp_db_path)
                    copied = True
                    print(f"Vercel: Copied DB from {src} to {tmp_db_path}")
                    break
                except Exception as e:
                    print("Vercel: DB copy notice:", e)
        if not copied:
            print("Vercel: Creating new DB at", tmp_db_path)
    db_url = f"sqlite:///{tmp_db_path}"

if _is_sqlite:
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        echo=settings.debug,
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=3600,
        pool_size=5,
        max_overflow=10,
        echo=settings.debug,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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


def check_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        if _is_sqlite:
            db_type = "SQLite"
        elif "postgres" in settings.database_url:
            db_type = "PostgreSQL (Supabase)"
        else:
            db_type = "SQL Database"
        print(f"Connected to {db_type}")
        return True
    except Exception as exc:
        print(f"Database connection failed: {exc}")
        return False


