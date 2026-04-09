"""
Router de transacciones (remesas).

Flujos soportados:
  SEND:    SENDER crea con amount_usd → RECEIVER confirma → exchange_rate bloqueado → COMPLETED
  REQUEST: RECEIVER crea con amount_gtq → SENDER confirma → exchange_rate bloqueado → COMPLETED

Zero Trust financiero:
  - El tipo de cambio NUNCA proviene del cliente.
  - Se consulta Frankfurter en el instante exacto de la confirmación y se
    persiste de forma inmutable. No se puede modificar a posteriori.
"""
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.dependencies import get_current_user, get_db
from app.services import exchange as exchange_svc

router = APIRouter(prefix="/transactions", tags=["transactions"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_tx_or_404(transaction_id: int, db: Session) -> models.Transaction:
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transacción no encontrada",
        )
    return tx


def _assert_pending(tx: models.Transaction) -> None:
    if tx.status != models.TransactionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo se pueden confirmar transacciones en estado PENDING",
        )


def _round_monetary(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ── POST /transactions/send ───────────────────────────────────────────────────

@router.post(
    "/send",
    response_model=schemas.TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar envío de remesa (SENDER)",
    description=(
        "Solo accesible para usuarios con rol SENDER. "
        "Registra el monto en USD. El tipo de cambio se bloquea al confirmar."
    ),
)
def create_send(
    body: schemas.TransactionSendCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.Transaction:
    if current_user.role != models.UserRole.SENDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los usuarios con rol SENDER pueden registrar envíos",
        )

    receiver = db.query(models.User).filter(models.User.id == body.receiver_id).first()
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
    if receiver.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No puedes enviarte una remesa a ti mismo",
        )

    tx = models.Transaction(
        transaction_type=models.TransactionType.SEND,
        sender_id=current_user.id,
        receiver_id=body.receiver_id,
        amount_usd=body.amount_usd,
        amount_gtq=None,        # se calcula al confirmar
        exchange_rate=None,     # se obtiene de Frankfurter al confirmar
        status=models.TransactionStatus.PENDING,
        motive=body.motive,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


# ── POST /transactions/request ────────────────────────────────────────────────

@router.post(
    "/request",
    response_model=schemas.TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Solicitar remesa en GTQ (RECEIVER)",
    description=(
        "Solo accesible para usuarios con rol RECEIVER. "
        "Registra el monto solicitado en GTQ. El tipo de cambio se bloquea al confirmar."
    ),
)
def create_request(
    body: schemas.TransactionRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.Transaction:
    if current_user.role != models.UserRole.RECEIVER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los usuarios con rol RECEIVER pueden solicitar remesas",
        )

    sender = db.query(models.User).filter(models.User.id == body.sender_id).first()
    if not sender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Remitente no encontrado",
        )
    if sender.role != models.UserRole.SENDER:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El remitente debe tener rol SENDER",
        )

    tx = models.Transaction(
        transaction_type=models.TransactionType.REQUEST,
        sender_id=body.sender_id,
        receiver_id=current_user.id,
        amount_usd=None,        # se calcula al confirmar
        amount_gtq=body.amount_gtq,
        exchange_rate=None,     # se obtiene de Frankfurter al confirmar
        status=models.TransactionStatus.PENDING,
        motive=body.motive,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


# ── PUT /transactions/{id}/confirm ────────────────────────────────────────────

@router.put(
    "/{transaction_id}/confirm",
    response_model=schemas.TransactionRead,
    summary="Confirmar transacción — bloquea tipo de cambio en tiempo real",
    description=(
        "Consulta Frankfurter en este instante exacto, calcula el monto complementario "
        "y persiste el exchange_rate de forma inmutable. Cambia el estado a COMPLETED.\n\n"
        "- Transacción SEND: solo el RECEIVER puede confirmar.\n"
        "- Transacción REQUEST: solo el SENDER puede confirmar."
    ),
)
async def confirm_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.Transaction:
    tx = _get_tx_or_404(transaction_id, db)
    _assert_pending(tx)

    # ── Verificación de autorización por tipo ─────────────────────────────────
    if tx.transaction_type == models.TransactionType.SEND:
        # Solo el RECEIVER de esa transacción puede confirmar un envío
        if current_user.id != tx.receiver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el receptor de esta transacción puede confirmarla",
            )
    else:  # REQUEST
        # Solo el SENDER de esa transacción puede confirmar una solicitud
        if current_user.id != tx.sender_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el remitente de esta transacción puede confirmarla",
            )

    # ── Consulta del tipo de cambio en tiempo real (Zero Trust) ───────────────
    # Este es el único lugar donde se obtiene el exchange_rate.
    # Se consulta ahora, se guarda ahora, y nunca más se modifica.
    rate: Decimal = await exchange_svc.get_current_usd_to_gtq()

    # ── Cálculo del monto complementario ─────────────────────────────────────
    if tx.transaction_type == models.TransactionType.SEND:
        # Se conoce amount_usd → calcular amount_gtq
        tx.amount_gtq = _round_monetary(tx.amount_usd * rate)
    else:
        # REQUEST: se conoce amount_gtq → calcular amount_usd
        tx.amount_usd = _round_monetary(tx.amount_gtq / rate)

    # ── Persistencia inmutable ─────────────────────────────────────────────────
    tx.exchange_rate = rate
    tx.status = models.TransactionStatus.COMPLETED

    db.commit()
    db.refresh(tx)
    return tx


# ── GET /transactions ─────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=schemas.Page[schemas.TransactionRead],
    summary="Listar transacciones con paginación",
    description=(
        "Devuelve las transacciones del usuario autenticado filtradas por rol:\n"
        "- SENDER: transacciones donde él es el remitente.\n"
        "- RECEIVER: transacciones donde él es el receptor."
    ),
)
def list_transactions(
    limit: int = Query(default=10, ge=1, le=100, description="Máximo de resultados por página"),
    offset: int = Query(default=0, ge=0, description="Desplazamiento desde el inicio"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.Page[schemas.TransactionRead]:
    base_query = db.query(models.Transaction)

    if current_user.role == models.UserRole.SENDER:
        base_query = base_query.filter(models.Transaction.sender_id == current_user.id)
    else:
        base_query = base_query.filter(models.Transaction.receiver_id == current_user.id)

    total = base_query.count()
    items = (
        base_query
        .order_by(models.Transaction.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return schemas.Page(items=items, total=total, limit=limit, offset=offset)


# ── GET /transactions/{id} ────────────────────────────────────────────────────

@router.get(
    "/{transaction_id}",
    response_model=schemas.TransactionRead,
    summary="Detalle de una transacción",
)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.Transaction:
    tx = _get_tx_or_404(transaction_id, db)

    # Zero Trust: solo los participantes directos pueden ver la transacción
    if tx.sender_id != current_user.id and tx.receiver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta transacción",
        )
    return tx
