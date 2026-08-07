from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://") and "+psycopg2" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

_is_sqlite = db_url.startswith("sqlite")

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
    """Create all tables defined in models."""
    import app.models  # noqa: F401 – ensure all models are imported
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")


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


