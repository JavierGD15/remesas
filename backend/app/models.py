import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, enum.Enum):
    SENDER = "SENDER"
    RECEIVER = "RECEIVER"


class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)

    sent_transactions = relationship(
        "Transaction",
        foreign_keys="Transaction.sender_id",
        back_populates="sender",
    )
    received_transactions = relationship(
        "Transaction",
        foreign_keys="Transaction.receiver_id",
        back_populates="receiver",
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Precisión monetaria: 18 dígitos, 2 decimales
    amount_usd = Column(Numeric(precision=18, scale=2), nullable=False)
    amount_gtq = Column(Numeric(precision=18, scale=2), nullable=False)
    exchange_rate = Column(Numeric(precision=10, scale=6), nullable=False)
    status = Column(
        Enum(TransactionStatus),
        nullable=False,
        default=TransactionStatus.PENDING,
    )
    motive = Column(String(255), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    sender = relationship(
        "User", foreign_keys=[sender_id], back_populates="sent_transactions"
    )
    receiver = relationship(
        "User", foreign_keys=[receiver_id], back_populates="received_transactions"
    )
