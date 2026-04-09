from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_password_hash
from app.dependencies import get_current_user, get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/",
    response_model=schemas.UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo usuario",
)
def create_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
) -> models.User:
    existing = (
        db.query(models.User).filter(models.User.username == user_in.username).first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El nombre de usuario ya está registrado",
        )
    user = models.User(
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get(
    "/me",
    response_model=schemas.UserRead,
    summary="Obtener perfil del usuario autenticado",
)
def get_me(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    return current_user
