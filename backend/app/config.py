from pydantic_settings import BaseSettings, SettingsConfigDict
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
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Student Management System"
    app_version: str = "1.0.0"
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Security
    secret_key: str = _DEFAULT_SECRET
    algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
    enable_demo_auth: bool = os.getenv("ENABLE_DEMO_AUTH", "false").lower() == "true"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in ("production", "prod")

    @model_validator(mode="after")
    def warn_insecure_defaults(self) -> "Settings":
        if self.is_production and self.secret_key == _DEFAULT_SECRET:
            warnings.warn(
                "CRITICAL SECURITY WARNING: Production environment detected with default SECRET_KEY! "
                "You must set a secure, unique SECRET_KEY in your production environment variables.",
                UserWarning,
                stacklevel=2,
            )
        elif self.secret_key == _DEFAULT_SECRET:
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
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from: str = os.getenv("SMTP_FROM", "")

    # AI Settings (NVIDIA & Gemini)
    nvidia_api_key: str = os.getenv("NVIDIA_API_KEY", "")
    nvidia_model: str = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3.5-lightning-30b-a3b")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    # File Upload — defaults to /tmp/uploads on Vercel, relative uploads in local dev
    upload_dir: str = os.getenv("UPLOAD_DIR", _DEFAULT_UPLOAD_DIR)
    max_file_size: int = int(os.getenv("MAX_FILE_SIZE", str(10 * 1024 * 1024)))  # 10 MB

    # Frontend URLs / Allowed CORS Origins
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    allowed_origins_raw: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,"
        "https://college-erp-management1.vercel.app,"
        "https://student-management-system-kappa-two.vercel.app,"
        "https://student-management-system-9yuf.onrender.com",
    )

    def get_allowed_origins(self) -> list[str]:
        """Return clean list of allowed CORS origins."""
        origins = [o.strip() for o in self.allowed_origins_raw.split(",") if o.strip()]
        if self.frontend_url and self.frontend_url not in origins:
            origins.append(self.frontend_url)
        return origins


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
