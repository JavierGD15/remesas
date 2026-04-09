"""
Servicio de tipo de cambio — Frankfurter API (https://api.frankfurter.app).

Zero Trust financiero: el tipo de cambio NUNCA se toma de una caché local
ni de un valor enviado por el cliente. Se consulta a la fuente autoritativa
en el momento exacto en que se confirma cada transacción.
"""
from datetime import date
from decimal import Decimal

import httpx
from fastapi import HTTPException, status

FRANKFURTER_BASE = "https://api.frankfurter.app"
_TIMEOUT = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)

# Par de divisas soportado
_FROM = "USD"
_TO = "GTQ"


def _extract_rate(data: dict) -> Decimal:
    """Extrae y valida la tasa GTQ del payload de Frankfurter."""
    rates = data.get("rates", {})
    if _TO not in rates:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La API de tipo de cambio no devolvió la tasa GTQ",
        )
    return Decimal(str(rates[_TO]))


def _handle_http_error(exc: httpx.HTTPStatusError) -> None:
    """Traduce errores HTTP de Frankfurter a HTTPException de FastAPI."""
    code = exc.response.status_code
    if code == 404:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No existen datos de tipo de cambio para la fecha indicada",
        )
    if code == 429:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Límite de solicitudes alcanzado en la API de tipo de cambio (rate limit)",
        )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"Error en la API de tipo de cambio (HTTP {code})",
    )


async def get_current_usd_to_gtq() -> Decimal:
    """
    Obtiene el tipo de cambio USD → GTQ en tiempo real.

    Lanza HTTP 503 si la API no está disponible o hay rate limit.
    Este es el único punto de entrada para obtener tasas en tiempo real;
    se invoca exclusivamente en el momento de confirmar una transacción.
    """
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(
                f"{FRANKFURTER_BASE}/latest",
                params={"from": _FROM, "to": _TO},
            )
            r.raise_for_status()
            return _extract_rate(r.json())
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tiempo de espera agotado al consultar la API de tipo de cambio",
        )
    except httpx.HTTPStatusError as exc:
        _handle_http_error(exc)
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo conectar con la API de tipo de cambio",
        )


async def get_historical_usd_to_gtq(on_date: date) -> Decimal:
    """
    Obtiene el tipo de cambio USD → GTQ para una fecha histórica específica.

    Args:
        on_date: Fecha en formato date (se serializa a YYYY-MM-DD).

    Lanza HTTP 400 si no hay datos para esa fecha.
    Lanza HTTP 503 ante caídas o rate limits de la API.
    """
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(
                f"{FRANKFURTER_BASE}/{on_date.isoformat()}",
                params={"from": _FROM, "to": _TO},
            )
            r.raise_for_status()
            return _extract_rate(r.json())
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tiempo de espera agotado al consultar la API de tipo de cambio",
        )
    except httpx.HTTPStatusError as exc:
        _handle_http_error(exc)
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo conectar con la API de tipo de cambio",
        )
