from slowapi import Limiter
from fastapi import Request
from app.config import settings


def get_remote_address(request: Request) -> str:
    """Safely extract remote IP for rate limiting, with Vercel x-forwarded-for fallback."""
    if request:
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        if request.client and request.client.host:
            return request.client.host
    return "127.0.0.1"


def _create_limiter() -> Limiter:
    """Initialize slowapi Limiter with Redis storage backend if configured, else in-memory fallback."""
    redis_url = getattr(settings, "redis_url", "")
    if redis_url:
        try:
            return Limiter(key_func=get_remote_address, storage_uri=redis_url)
        except Exception:
            pass
    return Limiter(key_func=get_remote_address)


limiter = _create_limiter()
