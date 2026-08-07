import bcrypt
import hashlib

def _truncate_password(password: str) -> bytes:
    if not password:
        return b""
    if isinstance(password, str):
        pwd_bytes = password.encode("utf-8")
        if len(pwd_bytes) > 72:
            return hashlib.sha256(pwd_bytes).hexdigest()[:72].encode("utf-8")
        return pwd_bytes
    return password[:72]


def hash_password(password: str) -> str:
    pwd_bytes = _truncate_password(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not plain or not hashed:
        return False
    try:
        plain_bytes = _truncate_password(plain)
        hashed_bytes = hashed.encode("utf-8") if isinstance(hashed, str) else hashed
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        try:
            from passlib.context import CryptContext
            ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
            return ctx.verify(plain[:72], hashed)
        except Exception:
            return False
