from pydantic_settings import BaseSettings
from pydantic import model_validator
from functools import lru_cache
import os
import warnings

_DEFAULT_SECRET = "supersecretkey-change-in-production-min32chars!!"

# Default to empty — must be set via DATABASE_URL env var or .env file
_DEFAULT_POSTGRES_URL = ""


# Detect serverless environment (Vercel)
_IS_VERCEL = bool(os.getenv("VERCEL") or os.getenv("VERCEL_ENV"))
_DEFAULT_UPLOAD_DIR = "/tmp/uploads" if _IS_VERCEL else os.path.abspath("uploads")


class Settings(BaseSettings):
    app_name: str = "Student Management System"
    app_version: str = "1.0.0"
    debug: bool = False

    # Security
    secret_key: str = _DEFAULT_SECRET
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    enable_demo_auth: bool = os.getenv("ENABLE_DEMO_AUTH", "false").lower() == "true"

    @model_validator(mode="after")
    def warn_insecure_defaults(self) -> "Settings":
        if self.secret_key == _DEFAULT_SECRET:
            warnings.warn(
                "SECURITY: Using the default SECRET_KEY. "
                "Set a strong SECRET_KEY in your .env file before deploying.",
                UserWarning,
                stacklevel=2,
            )
        if self.enable_demo_auth:
            warnings.warn(
                "SECURITY WARNING: ENABLE_DEMO_AUTH is enabled. "
                "Disable this in production environments by setting ENABLE_DEMO_AUTH=false.",
                UserWarning,
                stacklevel=2,
            )
        return self

    def ensure_upload_dir(self) -> str:
        """
        Lazily ensures the upload directory exists on-demand before file writes.
        Catches OSError safely on read-only serverless filesystems.
        """
        try:
            if self.upload_dir:
                os.makedirs(self.upload_dir, exist_ok=True)
        except (OSError, Exception) as err:
            warnings.warn(f"Upload directory creation warning: {err}", UserWarning)
        return self.upload_dir

    # Database: Supabase PostgreSQL
    database_url: str = os.getenv("DATABASE_URL", _DEFAULT_POSTGRES_URL)

    # Supabase (used by cloud object storage/realtime helpers)
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")  # service_role key — never expose to frontend
    supabase_storage_bucket: str = os.getenv("SUPABASE_STORAGE_BUCKET", "sms-uploads")

    # Redis (Distributed Caching, Token Blacklisting & Rate Limiting)
    redis_url: str = os.getenv("REDIS_URL", "")

    # Email (SMTP)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    # AI Settings (NVIDIA & Gemini)
    nvidia_api_key: str = os.getenv("NVIDIA_API_KEY", "")
    nvidia_model: str = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3.5-lightning-30b-a3b")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    # File Upload — defaults to /tmp/uploads on Vercel, relative uploads in local dev
    upload_dir: str = os.getenv("UPLOAD_DIR", _DEFAULT_UPLOAD_DIR)
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
