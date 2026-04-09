"""
Autenticación JWT + hashing bcrypt.
Los tokens expiran según ACCESS_TOKEN_EXPIRE_MINUTES en la configuración.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt
from passlib.context import CryptContext

from app.config import settings

# bcrypt como esquema único; deprecated="auto" migra hashes viejos automáticamente
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Contraseñas ───────────────────────────────────────────────

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# ── JWT ───────────────────────────────────────────────────────

def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    # JWTError se propaga al llamador para manejo explícito
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
