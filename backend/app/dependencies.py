"""
Dependencias de FastAPI — inyección de sesión DB y autenticación.
"""
from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app import models
from app.auth import decode_access_token
from app.database import SessionLocal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Sesión de base de datos ───────────────────────────────────

def get_db() -> Generator[Session, None, None]:
    """Genera una sesión SQLAlchemy y garantiza su cierre tras cada request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Usuario autenticado ───────────────────────────────────────

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    Valida el JWT Bearer y retorna el usuario activo.
    Lanza 401 ante cualquier problema con el token o usuario inexistente.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user
