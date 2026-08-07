from slowapi import Limiter
from fastapi import Request

def get_remote_address(request: Request) -> str:
    """Safely extract remote IP for rate limiting, with Vercel x-forwarded-for fallback."""
    if request:
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        if request.client and request.client.host:
            return request.client.host
    return "127.0.0.1"

limiter = Limiter(key_func=get_remote_address)
