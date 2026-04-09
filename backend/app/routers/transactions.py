from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.dependencies import get_current_user, get_db

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post(
    "/",
    response_model=schemas.TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear remesa",
)
def create_transaction(
    tx_in: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.Transaction:
    if current_user.role != models.UserRole.SENDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los remitentes (SENDER) pueden crear transacciones",
        )

    receiver = db.query(models.User).filter(models.User.id == tx_in.receiver_id).first()
    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receptor no encontrado",
        )
    if receiver.role != models.UserRole.RECEIVER:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El destinatario debe tener rol RECEIVER",
        )

    amount_gtq = (tx_in.amount_usd * tx_in.exchange_rate).quantize(Decimal("0.01"))

    tx = models.Transaction(
        sender_id=current_user.id,
        receiver_id=tx_in.receiver_id,
        amount_usd=tx_in.amount_usd,
        amount_gtq=amount_gtq,
        exchange_rate=tx_in.exchange_rate,
        status=models.TransactionStatus.PENDING,
        motive=tx_in.motive,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.get(
    "/",
    response_model=list[schemas.TransactionRead],
    summary="Listar transacciones del usuario autenticado",
)
def list_transactions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[models.Transaction]:
    if current_user.role == models.UserRole.SENDER:
        return (
            db.query(models.Transaction)
            .filter(models.Transaction.sender_id == current_user.id)
            .all()
        )
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.receiver_id == current_user.id)
        .all()
    )


@router.get(
    "/{transaction_id}",
    response_model=schemas.TransactionRead,
    summary="Obtener detalle de una transacción",
)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.Transaction:
    tx = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == transaction_id)
        .first()
    )
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transacción no encontrada",
        )
    # Zero Trust: solo el remitente o receptor de la tx pueden verla
    if tx.sender_id != current_user.id and tx.receiver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta transacción",
        )
    return tx


@router.patch(
    "/{transaction_id}/status",
    response_model=schemas.TransactionRead,
    summary="Actualizar estado de una transacción",
)
def update_transaction_status(
    transaction_id: int,
    body: schemas.TransactionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.Transaction:
    tx = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == transaction_id)
        .first()
    )
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transacción no encontrada",
        )
    # Solo el remitente puede marcar como completada
    if tx.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el remitente puede actualizar el estado",
        )
    tx.status = body.status
    db.commit()
    db.refresh(tx)
    return tx
