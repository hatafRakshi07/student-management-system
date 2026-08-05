import uuid
import time
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, status
from app.config import settings

# In-memory revocation store: {jti: expiry_unix_timestamp}
# Entries are pruned when they expire to prevent unbounded growth.
_revoked_tokens: dict[str, float] = {}


def _cleanup_revoked() -> None:
    """Remove expired entries from the revocation store."""
    now = time.time()
    expired = [jti for jti, exp in _revoked_tokens.items() if exp < now]
    for jti in expired:
        del _revoked_tokens[jti]


def revoke_token(jti: str, expiry: float) -> None:
    """Add a JTI to the revocation store until it naturally expires."""
    _cleanup_revoked()
    _revoked_tokens[jti] = expiry


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        jti = payload.get("jti")
        if jti and jti in _revoked_tokens:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def create_refresh_token(data: dict) -> str:
    """Create a long-lived refresh token valid for 7 days."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh", "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def verify_refresh_token(token: str) -> dict:
    """Verify refresh token signature, type, and revocation status."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        jti = payload.get("jti")
        if jti and jti in _revoked_tokens:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )


