import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

_redis_client = None
_redis_checked = False


def get_redis_client():
    """
    Lazily initialize and return a Redis client instance if REDIS_URL is configured.
    Returns None if Redis is not configured or connection fails, allowing graceful fallback.
    """
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client

    redis_url = getattr(settings, "redis_url", "")
    if not redis_url:
        _redis_checked = True
        _redis_client = None
        return None

    try:
        import redis
        client = redis.from_url(redis_url, decode_responses=True, socket_timeout=3.0)
        # Test connection ping
        client.ping()
        logger.info("Successfully connected to Redis distributed cache.")
        _redis_client = client
    except Exception as e:
        logger.warning(f"Redis initialization notice ({e}). Falling back to local in-memory storage.")
        _redis_client = None
    finally:
        _redis_checked = True

    return _redis_client
