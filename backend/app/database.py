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
    High-performance database engine initialization for Vercel and Render.
    Attempts PostgreSQL with fast fallback to clean writable database on serverless.
    """
    db_url = _get_database_url()
    is_vercel = bool(os.getenv("VERCEL"))

    # For PostgreSQL / Supabase
    if not db_url.startswith("sqlite"):
        try:
            eng = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_recycle=300,
                pool_size=5,
                max_overflow=10,
                future=True,
                connect_args={
                    "connect_timeout": 3,
                    "sslmode": "require",
                },
                echo=False,
            )
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("Successfully connected to PostgreSQL database.")
            return eng
        except Exception as exc:
            print(f"PostgreSQL connection notice ({exc}). Initializing SQLite fallback database...")


    # On Vercel or local fallback: initialize clean database in /tmp
    db_path = "/tmp/student_management_prod.db" if is_vercel else "./student_management.db"
    sqlite_url = f"sqlite:///{db_path}"
    
    sqlite_eng = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False, "timeout": 30.0},
        echo=False,
    )

    from sqlalchemy import event
    @event.listens_for(sqlite_eng, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=30000")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.close()
        except Exception:
            pass


    # Safe column migration for SQLite fallback
    try:
        with sqlite_eng.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(100)"))
                conn.commit()
            except Exception:
                pass
    except Exception:
        pass

    return sqlite_eng


engine = _init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)



def check_connection() -> bool:
    """Verify live database connectivity at runtime."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        print("Database health check notice:", exc)
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
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(100)"))
                conn.commit()
            except Exception:
                pass
        Base.metadata.create_all(bind=engine)
        print("Database schema verified.")
        _tables_initialized = True
        
        try:
            from app.seed import seed_database
            seed_database()
            from app.seed_aklank_staff import seed_aklank_staff_data
            seed_aklank_staff_data()
        except Exception as seed_err:
            print("Seed notice:", seed_err)
    except Exception as err:
        print("Schema init notice:", err)
