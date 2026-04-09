from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, transactions, users

# Crear tablas al arrancar (en producción usar Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Don Alex API",
    description="API de remesas internacionales — Don Alex",
    version="0.1.0",
    # En producción (APP_ENV != development) se deshabilita la documentación pública
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(transactions.router)


@app.get("/health", tags=["health"])
def health_check() -> dict:
    return {"status": "ok", "env": settings.APP_ENV}
