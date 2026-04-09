"""
Esquemas Pydantic — Zero Trust.
Toda entrada externa se valida estrictamente antes de llegar a la capa de negocio.
Los montos y tasas de cambio NUNCA se aceptan del cliente en el flujo de confirmación.
"""
from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, Field, field_validator

from app.models import TransactionStatus, TransactionType, UserRole

T = TypeVar("T")


# ── Usuarios ──────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=128)
    role: UserRole


class UserRead(BaseModel):
    id: int
    username: str
    role: UserRole

    model_config = {"from_attributes": True}


# ── Autenticación ─────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: str | None = None


# ── Transacciones — Creación ──────────────────────────────────────────────────

class TransactionSendCreate(BaseModel):
    """
    Payload para POST /transactions/send (solo SENDER).
    El monto en GTQ y el tipo de cambio se calculan en la confirmación.
    """
    receiver_id: int = Field(gt=0)
    amount_usd: Decimal = Field(
        gt=Decimal("0"),
        max_digits=18,
        decimal_places=2,
        description="Monto a enviar en USD. Debe ser mayor a 0.",
    )
    motive: str | None = Field(default=None, max_length=255)

    @field_validator("amount_usd", mode="after")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0"):
            raise ValueError("El monto debe ser mayor a cero")
        return v


class TransactionRequestCreate(BaseModel):
    """
    Payload para POST /transactions/request (solo RECEIVER).
    El monto en USD y el tipo de cambio se calculan en la confirmación.
    """
    sender_id: int = Field(gt=0)
    amount_gtq: Decimal = Field(
        gt=Decimal("0"),
        max_digits=18,
        decimal_places=2,
        description="Monto solicitado en GTQ. Debe ser mayor a 0.",
    )
    motive: str = Field(
        min_length=1,
        max_length=255,
        description="Motivo de la solicitud (requerido para REQUEST).",
    )

    @field_validator("amount_gtq", mode="after")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0"):
            raise ValueError("El monto debe ser mayor a cero")
        return v


# ── Transacciones — Lectura ───────────────────────────────────────────────────

class TransactionRead(BaseModel):
    id: int
    transaction_type: TransactionType
    sender_id: int
    receiver_id: int
    amount_usd: Decimal | None
    amount_gtq: Decimal | None
    exchange_rate: Decimal | None
    status: TransactionStatus
    motive: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Paginación ────────────────────────────────────────────────────────────────

class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int
