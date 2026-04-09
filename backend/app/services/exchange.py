"""
Servicio de tipo de cambio — ExchangeRate API (https://open.er-api.com).

Nota: Frankfurter (api.frankfurter.app) eliminó GTQ de su nuevo dominio
(api.frankfurter.dev/v1) en 2026. Se migró a open.er-api.com, que soporta
GTQ de forma gratuita y sin API key.

Zero Trust financiero: el tipo de cambio NUNCA se toma de una caché local
ni de un valor enviado por el cliente. Se consulta a la fuente autoritativa
en el momento exacto en que se confirma cada transacción.
"""
from datetime import date
from decimal import Decimal

import httpx
from fastapi import HTTPException, status

# Base de la API — free tier, no requiere API key, incluye GTQ
_BASE = "https://open.er-api.com/v6/latest"
_TIMEOUT = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)

_FROM = "USD"
_TO = "GTQ"


def _extract_rate(data: dict) -> Decimal:
    """Extrae y valida la tasa GTQ del payload de ExchangeRate API."""
    if data.get("result") == "error":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error en la API de tipo de cambio: {data.get('error-type', 'desconocido')}",
        )
    rates = data.get("rates", {})
    if _TO not in rates:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La API de tipo de cambio no devolvió la tasa GTQ",
        )
    return Decimal(str(rates[_TO]))


def _handle_http_error(exc: httpx.HTTPStatusError) -> None:
    """Traduce errores HTTP a HTTPException de FastAPI."""
    code = exc.response.status_code
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
            r = await client.get(f"{_BASE}/{_FROM}")
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
    Obtiene el tipo de cambio USD → GTQ para una fecha histórica.

    Nota: open.er-api.com no ofrece tasas históricas en el tier gratuito.
    Se devuelve la tasa actual como aproximación para fechas recientes.
    """
    return await get_current_usd_to_gtq()
