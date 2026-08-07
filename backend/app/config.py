from pydantic_settings import BaseSettings
from pydantic import model_validator
from functools import lru_cache
import os
import warnings

_DEFAULT_SECRET = "supersecretkey-change-in-production-min32chars!!"

# Default Production Supabase PostgreSQL Connection
_DEFAULT_POSTGRES_URL = (
    "postgresql+psycopg2://postgres:hatafrakshi@db.xiszpcerozlsrxwuasgm.supabase.co:5432/postgres"
)


class Settings(BaseSettings):
    app_name: str = "Student Management System"
    app_version: str = "1.0.0"
    debug: bool = False

    # Security
    secret_key: str = _DEFAULT_SECRET
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    @model_validator(mode="after")
    def warn_insecure_defaults(self) -> "Settings":
        if self.secret_key == _DEFAULT_SECRET:
            warnings.warn(
                "SECURITY: Using the default SECRET_KEY. "
                "Set a strong SECRET_KEY in your .env file before deploying.",
                UserWarning,
                stacklevel=2,
            )
        return self

    # Database: Supabase PostgreSQL
    database_url: str = os.getenv("DATABASE_URL", _DEFAULT_POSTGRES_URL)

    # Supabase (optional — used by storage/realtime helpers)
    supabase_url: str = ""
    supabase_service_key: str = ""  # service_role key — never expose to frontend

    # Email (SMTP)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    # Gemini AI
    gemini_api_key: str = ""

    # File Upload
    upload_dir: str = "uploads"
    max_file_size: int = 10485760  # 10 MB

    # Frontend URL (CORS)
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
