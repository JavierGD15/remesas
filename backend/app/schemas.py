"""
Esquemas Pydantic — Zero Trust.
Toda entrada externa se valida estrictamente antes de llegar a la capa de negocio.
"""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.models import TransactionStatus, UserRole


# ── Usuarios ──────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=128)
    role: UserRole


class UserRead(BaseModel):
    id: int
    username: str
    role: UserRole

    model_config = {"from_attributes": True}


# ── Autenticación ─────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: str | None = None


# ── Transacciones ─────────────────────────────────────────────

class TransactionCreate(BaseModel):
    receiver_id: int = Field(gt=0)
    amount_usd: Decimal = Field(
        gt=Decimal("0"),
        max_digits=18,
        decimal_places=2,
        description="Monto en USD, mayor a 0",
    )
    exchange_rate: Decimal = Field(
        gt=Decimal("0"),
        max_digits=10,
        decimal_places=6,
        description="Tipo de cambio USD→GTQ, mayor a 0",
    )
    motive: str | None = Field(
        default=None,
        max_length=255,
        description="Motivo de la remesa (opcional, máx. 255 caracteres)",
    )

    @field_validator("amount_usd", "exchange_rate", mode="after")
    @classmethod
    def must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0"):
            raise ValueError("El valor debe ser mayor a cero")
        return v


class TransactionRead(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    amount_usd: Decimal
    amount_gtq: Decimal
    exchange_rate: Decimal
    status: TransactionStatus
    motive: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionStatusUpdate(BaseModel):
    status: TransactionStatus
