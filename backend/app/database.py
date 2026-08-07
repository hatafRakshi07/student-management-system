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
            echo=settings.debug,
        )
        try:
            import app.models  # noqa: F401
            Base.metadata.create_all(bind=eng)
            from app.seed import seed_database
            seed_database()
        except Exception:
            pass
        return eng

    # For PostgreSQL / Supabase, attempt connection test with 3s timeout
    try:
        test_eng = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={"connect_timeout": 3},
            echo=settings.debug,
        )
        with test_eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        import app.models  # noqa: F401
        Base.metadata.create_all(bind=test_eng)
        print("Connected to PostgreSQL database cleanly")
        return test_eng
    except Exception as exc:
        print(f"PostgreSQL connection failed ({exc}). Falling back to SQLite database...")
        fallback_url = _setup_tmp_sqlite() if os.getenv("VERCEL") else "sqlite:///./student_management.db"
        eng = create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
            echo=settings.debug,
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
        Base.metadata.create_all(bind=engine)
        print("Database tables created.")
        from app.seed import seed_database
        seed_database()
    except Exception as err:
        print("Auto-seed notice:", err)
