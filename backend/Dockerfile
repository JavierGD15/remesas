# =============================================================
# DON ALEX — Backend Dockerfile (multietapa)
# Zero Trust: no se copian archivos .env al contenedor.
# Las variables se inyectan en tiempo de ejecución.
# =============================================================

# ── Etapa 1: dependencias ─────────────────────────────────────
FROM python:3.11-slim AS dependencies

WORKDIR /app

# Instalar dependencias del sistema necesarias para psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Etapa 2: desarrollo ───────────────────────────────────────
FROM dependencies AS development

WORKDIR /app

# El código se monta como volumen en dev (no se copia aquí)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ── Etapa 3: producción ───────────────────────────────────────
FROM dependencies AS production

WORKDIR /app

COPY . .

# Asegurarse de que .env nunca se copie (reforzado por .dockerignore)
RUN find . -name ".env" -delete || true

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
