# Don Alex — Sistema de Remesas Internacionales

Sistema fullstack para gestión de remesas entre un remitente en el exterior (SENDER) y un receptor en Guatemala (RECEIVER). El tipo de cambio USD → GTQ se obtiene de una API externa en el **instante exacto** de la confirmación y se persiste de forma **inmutable** en la base de datos. La arquitectura completa aplica el principio **Zero Trust** en cada capa.

---

## Índice

1. [Arquitectura](#arquitectura)
2. [Prerrequisitos](#prerrequisitos)
3. [Configuración inicial](#configuración-inicial)
4. [Levantar el proyecto](#levantar-el-proyecto)
5. [Crear usuarios de prueba](#crear-usuarios-de-prueba)
6. [Flujo de uso](#flujo-de-uso)
7. [Estructura del monorepo](#estructura-del-monorepo)
8. [Preguntas de Reflexión](#preguntas-de-reflexión)

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                         NAVEGADOR                           │
│         React 18 + TypeScript + Vite + Tailwind CSS         │
│  Zustand (auth state) · Axios (JWT interceptor) · Recharts  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI — Python 3.11 (puerto 8000)            │
│  ├── JWT (python-jose)  ·  bcrypt (passlib)                 │
│  ├── SQLAlchemy ORM     ·  Pydantic v2 (validación estricta)│
│  └── httpx AsyncClient  →  api.frankfurter.app (SOLO en     │
│                             el momento de confirmación)     │
└──────────────┬─────────────────────────┬────────────────────┘
               │                         │ httpx (async)
               ▼                         ▼
┌──────────────────────┐    ┌─────────────────────────────────┐
│   PostgreSQL 15       │    │   Frankfurter API (externa)     │
│   Modelos: User,      │    │   GET /latest?from=USD&to=GTQ   │
│   Transaction         │    │   Tasa consultada UNA SOLA VEZ  │
│   (exchange_rate      │    │   por transacción y nunca más   │
│   inmutable en BD)    │    │   modificada.                   │
└──────────────────────┘    └─────────────────────────────────┘
```

Todo orquestado con **Docker Compose** (red interna `don_alex_network`).

---

## Prerrequisitos

| Herramienta | Versión mínima |
|-------------|---------------|
| **Docker Desktop** | 24.x |
| **Docker Compose** | v2 (incluido en Docker Desktop) |

> No se necesita Node.js, Python ni PostgreSQL instalados localmente.

---

## Configuración inicial

Antes del primer arranque crea los tres archivos de entorno copiando los ejemplos:

```bash
# Variables para docker-compose (PostgreSQL + puertos)
cp .env.example .env

# Variables del backend (JWT, app settings)
cp backend/.env.example backend/.env

# Variables del frontend (URL del backend)
cp frontend/.env.example frontend/.env
```

Luego edita cada archivo con valores reales. Ejemplo mínimo funcional para desarrollo local:

**`.env`** (raíz)
```env
POSTGRES_DB=don_alex_db
POSTGRES_USER=don_alex_user
POSTGRES_PASSWORD=S3cretoDev2025!

# Puertos opcionales (defaults: 5432, 8000, 5173)
DB_PORT=5432
BACKEND_PORT=8000
FRONTEND_PORT=5173
```

**`backend/.env`**
```env
DATABASE_URL=postgresql://don_alex_user:S3cretoDev2025!@db:5432/don_alex_db
SECRET_KEY=cambia-esta-clave-por-una-de-al-menos-32-caracteres-aleatorios
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
APP_ENV=development
DEBUG=true
```

**`frontend/.env`**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=Don Alex
VITE_APP_ENV=development
```

> ⚠️ **Seguridad**: Los archivos `.env` están en `.gitignore`. Nunca los subas a un repositorio.

---

## Levantar el proyecto

```bash
docker-compose up --build
```

Este único comando:
1. Construye la imagen del backend (Python 3.11, dependencias de `requirements.txt`).
2. Construye la imagen del frontend (Node 20, `npm ci`).
3. Levanta PostgreSQL 15 y espera a que el healthcheck pase.
4. Inicia FastAPI (con `--reload`) y el servidor de desarrollo de Vite.

| Servicio | URL local |
|----------|-----------|
| **Frontend** (React/Vite) | http://localhost:5173 |
| **Backend** (FastAPI) | http://localhost:8000 |
| **API Docs** (Swagger, solo `DEBUG=true`) | http://localhost:8000/docs |
| **Health check** | http://localhost:8000/health |

Para detener:
```bash
docker-compose down          # detiene y elimina contenedores
docker-compose down -v       # además elimina el volumen de PostgreSQL
```

---

## Crear usuarios de prueba

Las tablas se crean automáticamente al iniciar el backend (`Base.metadata.create_all`). Registra los dos perfiles con curl o desde la Swagger UI (`/docs`):

### 1 · Registrar al Hijo (SENDER)

```bash
curl -s -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{"username": "carlos_hijo", "password": "MiClave123!", "role": "SENDER"}' \
  | python -m json.tool
```

### 2 · Registrar a Don Alex (RECEIVER)

```bash
curl -s -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{"username": "don_alex", "password": "Familia2025!", "role": "RECEIVER"}' \
  | python -m json.tool
```

### 3 · Obtener un token JWT

```bash
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=carlos_hijo&password=MiClave123!" \
  | python -m json.tool
```

Respuesta esperada:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Credenciales de prueba rápidas (resumen)

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| SENDER (hijo) | `carlos_hijo` | `MiClave123!` |
| RECEIVER (Don Alex) | `don_alex` | `Familia2025!` |

---

## Flujo de uso

```
1. Hijo (SENDER) inicia sesión → Dashboard con gráfico de tendencias
2. Hijo registra un envío: POST /transactions/send
   └── amount_usd = 100.00, receiver_id = <id de don_alex>
   └── Estado: PENDING, exchange_rate = NULL

3. Don Alex (RECEIVER) inicia sesión → Vista accesible
4. Don Alex confirma la recepción: PUT /transactions/{id}/confirm
   └── Backend consulta Frankfurter API en ese instante exacto
   └── Calcula amount_gtq = 100.00 × tasa_actual
   └── Persiste exchange_rate (INMUTABLE)
   └── Estado: COMPLETED

5. Don Alex puede solicitar dinero: POST /transactions/request
   └── amount_gtq = 800.00, motive = "Medicamentos"
   └── El Hijo confirma y el proceso se repite
```

---

## Estructura del monorepo

```
.
├── .env.example                 ← Variables raíz (PostgreSQL + puertos)
├── .gitignore                   ← Excluye .env*, node_modules, __pycache__, etc.
├── docker-compose.yml           ← Orquestación: db, backend, frontend
│
├── backend/
│   ├── Dockerfile               ← Multietapa: dependencies → development → production
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py              ← FastAPI app (CORS, docs condicionales)
│       ├── config.py            ← pydantic-settings (lee .env)
│       ├── database.py          ← Engine SQLAlchemy + SessionLocal
│       ├── models.py            ← User, Transaction (enums, FKs)
│       ├── schemas.py           ← Pydantic v2 (validación estricta)
│       ├── auth.py              ← bcrypt + JWT (python-jose)
│       ├── dependencies.py      ← get_db() + get_current_user()
│       ├── services/
│       │   └── exchange.py      ← httpx async → Frankfurter API
│       └── routers/
│           ├── auth.py          ← POST /auth/login
│           ├── users.py         ← POST /users/ · GET /users/me
│           └── transactions.py  ← send · request · confirm · list
│
└── frontend/
    ├── Dockerfile               ← Node 20 Alpine, dev server
    ├── vite.config.ts           ← code splitting (recharts chunk separado)
    ├── tailwind.config.js
    └── src/
        ├── api/
        │   ├── axios.ts         ← Instancia + interceptores (Bearer + 401)
        │   └── transactions.ts  ← Módulo de peticiones
        ├── store/
        │   ├── authStore.ts     ← Zustand persist (token + user)
        │   └── toastStore.ts    ← Notificaciones globales
        ├── hooks/
        │   └── useTransactions.ts
        ├── components/
        │   ├── ui/              ← Skeleton, Toast, Pagination
        │   ├── charts/          ← TrendChart (recharts AreaChart)
        │   └── transactions/    ← SendForm, RequestForm, TransactionList
        └── pages/
            ├── LoginPage.tsx
            ├── SenderDashboard.tsx   ← Stats + gráfico + tabla paginada
            └── ReceiverDashboard.tsx ← UI accesible para adultos mayores
```

---

## Preguntas de Reflexión

### 1. ¿Cómo se garantiza la inmutabilidad del tipo de cambio y por qué es crítico para el negocio?

Esta es la decisión de diseño más importante del sistema. En un servicio de remesas, el tipo de cambio es un **dato financiero con valor legal**: si fuese manipulable después del hecho, se podría alterar retroactivamente el monto que recibió el beneficiario.

La garantía se implementa en tres capas:

**Capa de modelo (base de datos):** El campo `exchange_rate` en la tabla `transactions` es `nullable=True` durante la fase `PENDING`. Una vez que se llama a `PUT /transactions/{id}/confirm`, el valor se escribe **una sola vez** y el endpoint no expone ninguna ruta para modificarlo a posteriori. No existe un `PATCH /transactions/{id}/exchange_rate`. La única mutación permitida sobre una transacción confirmada es de lectura.

**Capa de servicio (backend):** La función `confirm_transaction` en `routers/transactions.py` es el **único punto de entrada** al tipo de cambio real. El flujo es estrictamente lineal e irreversible:
```python
# 1. Verificar PENDING (no se puede confirmar dos veces)
_assert_pending(tx)
# 2. Consultar Frankfurter AHORA, en este request exacto
rate = await exchange_svc.get_current_usd_to_gtq()
# 3. Calcular y persistir — nunca se vuelve a tocar
tx.exchange_rate = rate
tx.status = TransactionStatus.COMPLETED
db.commit()
```

**Capa de API (cliente):** El endpoint `confirm` no acepta ningún parámetro de tipo de cambio en el body. El cliente no puede proponer ni influir en la tasa. Si alguien intentara enviar `{"exchange_rate": 1.0}` sería ignorado porque el schema `confirm` no tiene ese campo.

**Por qué es crítico para el negocio:** En Guatemala, el quetzal fluctúa. Si un hijo envía $100 y la confirmación se hace horas después, la diferencia puede ser de varios quetzales. Al bloquear la tasa en el instante de la confirmación se establece exactamente cuánto dinero recibirá la familia, lo cual es la promesa central del servicio.

---

### 2. ¿Cómo se aplicó el principio Zero Trust a lo largo del stack completo?

Zero Trust significa **"nunca confiar, siempre verificar"**, sin importar el origen de la solicitud. En este proyecto se aplica en cada capa:

**Infraestructura:** Los archivos `.env` nunca se versionan (regla doble en `.gitignore` y `.dockerignore`). Las credenciales solo existen en tiempo de ejecución, inyectadas por Docker Compose. El Dockerfile de producción incluye `find . -name ".env" -delete` como salvaguarda adicional para que ningún secreto entre accidentalmente a la imagen.

**Backend — autenticación:** Cada endpoint protegido pasa por `get_current_user()`, que decodifica y valida el JWT en cada petición. No existe sesión del lado del servidor; el token es autocontenido y expira. El error de login es genérico ("usuario o contraseña incorrectos") para no revelar si el usuario existe o no (mitigación de enumeración de usuarios).

**Backend — autorización por rol:** Después de autenticar, se verifica el rol: `POST /transactions/send` lanza `403` si el usuario no es `SENDER`, aunque tenga un JWT válido. Un `RECEIVER` con token no puede ver transacciones de otro `RECEIVER`. El endpoint `confirm` verifica que el usuario sea exactamente el participante correcto de esa transacción específica:
```python
if tx.transaction_type == TransactionType.SEND:
    if current_user.id != tx.receiver_id:
        raise HTTPException(403, ...)
```

**Backend — validación de entradas (Pydantic):** Toda entrada externa pasa por esquemas con restricciones estrictas: montos `> 0`, `max_digits`, longitud de cadenas, regex en usernames. Nunca se confía en que el cliente envíe datos válidos.

**Frontend — validación Zero Trust en UI:** El formulario de login y los de transacciones validan localmente antes de enviar la petición. No es por seguridad (el backend siempre valida también), sino para no consumir una petición innecesaria y proporcionar feedback inmediato. El token JWT **nunca se decodifica en el cliente** — los datos del usuario se obtienen de `GET /users/me` en el servidor autoritativo.

**Frontend — interceptor 401:** Si un token expira, el interceptor de respuesta de Axios limpia el estado y redirige a `/login` automáticamente. No existe ruta que muestre datos sin un token válido.

---

### 3. ¿Por qué se eligió FastAPI, React/Vite y PostgreSQL? ¿Qué ventajas aporta cada uno en el contexto de este sistema?

**FastAPI (Python):**
- **Rendimiento:** Basado en Starlette y Uvicorn (ASGI), soporta async nativo. Crítico para el endpoint `confirm`, que necesita await sobre la llamada a Frankfurter sin bloquear el event loop.
- **Tipado automático:** La integración con Pydantic v2 permite declarar los esquemas de entrada/salida como clases Python con validación automática, serialización y generación de documentación OpenAPI sin código adicional.
- **Seguridad declarativa:** El sistema de `Depends()` permite componer `get_db()` + `get_current_user()` en cualquier endpoint con una sola línea, sin repetir lógica.
- **Documentación en vivo:** `/docs` (Swagger UI) se genera automáticamente, lo que facilita las pruebas de integración sin cliente externo.

**React 18 + Vite + TypeScript:**
- **Vite** proporciona un servidor de desarrollo con HMR instantáneo y un build de producción optimizado (Rollup). En este proyecto, la configuración `manualChunks` separa recharts (~383 kB) del código de la aplicación (~74 kB), mejorando el tiempo de carga en entornos lentos.
- **TypeScript** captura errores en tiempo de compilación. El tipo `Transaction` en `src/types/index.ts` es la fuente de verdad compartida entre formularios, tablas y el gráfico.
- **Zustand** fue elegido sobre Context API por su API mínima (sin `Provider`), su integración directa con `localStorage` mediante el middleware `persist`, y la posibilidad de leer el store fuera de componentes (`useAuthStore.getState()` en el interceptor de Axios).

**PostgreSQL 15:**
- **Tipos `Numeric(precision, scale)`:** Para datos monetarios es imprescindible evitar errores de punto flotante. `Numeric(18, 2)` garantiza exactitud centesimal para USD y GTQ. Usar `FLOAT` en un sistema financiero es un anti-patrón conocido.
- **ACID:** Las transacciones de base de datos garantizan que el `exchange_rate` y el `status = COMPLETED` se escriban atómicamente. Si el servidor cae entre el cálculo de la tasa y el commit, la transacción permanece en `PENDING` y puede reintentarse, sin datos a medio guardar.
- **Enums nativos:** `UserRole` y `TransactionStatus` como `Enum` en PostgreSQL garantizan integridad de dominio a nivel de base de datos, no solo a nivel de aplicación.

---

### 4. ¿Cómo se maneja la dependencia de la API externa (Frankfurter) y qué ocurre si falla?

**Diseño resiliente en `services/exchange.py`:** El cliente httpx tiene timeouts explícitos y diferenciados:
```python
_TIMEOUT = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)
```
Esto evita que una petición lenta bloquee el servidor indefinidamente.

**Mapeo exhaustivo de errores:** Cada tipo de falla produce un código HTTP semántico diferente:

| Causa | Código devuelto | Impacto en el usuario |
|-------|-----------------|----------------------|
| Timeout de red | `503 Service Unavailable` | Toast: "Tiempo de espera agotado" |
| Rate limit (429) | `503 Service Unavailable` | Toast: "Límite de solicitudes" |
| Fecha sin datos (404) | `400 Bad Request` | Toast: "No hay datos para esa fecha" |
| Error de red/DNS | `503 Service Unavailable` | Toast: "No se pudo conectar" |

**Comportamiento ante fallo:** Si Frankfurter no está disponible cuando el usuario pulsa "Confirmar", la transacción permanece en estado `PENDING` en la base de datos. El receptor puede intentar confirmar de nuevo minutos después sin consecuencias. No hay datos corruptos ni estados intermedios inconsistentes.

**Por qué Frankfurter:** Es una API pública, sin autenticación, con soporte oficial para el par USD/GTQ, actualizaciones diarias de tasas del Banco Central Europeo, y sin límites agresivos de uso. Otras alternativas como Open Exchange Rates o CurrencyLayer requieren API key y tienen planes de pago para frecuencias altas.

**Mejora para producción:** Se podría implementar un Circuit Breaker con reintentos con backoff exponencial, y un caché Redis con TTL de 30 minutos para reducir la latencia y el riesgo de indisponibilidad del servicio externo, siempre dejando claro en los registros que la tasa proviene del caché y no del proveedor en tiempo real.

---

### 5. ¿Cómo funciona el sistema de autenticación y qué consideraciones de seguridad se tomaron?

**Flujo completo:**

```
1. POST /auth/login (form-encoded: username, password)
   └── Consulta User por username en BD
   └── bcrypt.verify(plain_password, hashed_password)
   └── Si OK → jwt.encode({sub: username, exp: ahora + 60min})
   └── Devuelve {access_token, token_type: "bearer"}

2. Frontend: axios POST + header manual → GET /users/me
   └── Obtiene {id, username, role} del servidor (no decodifica JWT)
   └── Zustand persist: {token, user} → localStorage

3. Cada petición posterior:
   └── Interceptor axios: config.headers.Authorization = `Bearer ${token}`

4. Cada endpoint protegido:
   └── get_current_user() → decodifica JWT → busca User en BD
   └── Si JWT expirado o usuario no existe → 401
```

**Consideraciones de seguridad implementadas:**

- **bcrypt con `deprecated="auto"`:** Permite migrar automáticamente hashes de versiones anteriores sin interrumpir el servicio.
- **Error genérico en login:** El mensaje "usuario o contraseña incorrectos" no revela cuál de los dos falló, previniendo enumeración de usuarios.
- **JWT sin estado:** El backend no mantiene sesiones. La revocación requeriría una lista negra (no implementada en esta versión), pero la expiración configurable (`ACCESS_TOKEN_EXPIRE_MINUTES`) limita la ventana de exposición.
- **SECRET_KEY en variable de entorno:** Nunca en código. Mínimo 32 caracteres aleatorios recomendados.
- **Docs deshabilitados en producción:** `docs_url=None` y `redoc_url=None` cuando `DEBUG=False`, para no exponer la superficie de API.
- **CORS restringido:** `allow_origins=["*"]` solo con `DEBUG=True`. En producción, la lista es vacía hasta que se configure el dominio real.

**Trade-off de almacenamiento del token:** Se usa `localStorage` via Zustand persist, que es vulnerable a ataques XSS. La alternativa más segura sería `httpOnly cookies` gestionadas por un BFF (Backend for Frontend), pero requeriría cambios en la arquitectura del servidor. Para esta fase, la mitigación es no usar `dangerouslySetInnerHTML`, tener una CSP estricta y limitar la duración del token.

---

### 6. ¿Cómo escalarías esta arquitectura para manejar un mayor volumen de transacciones?

**Nivel de base de datos:**
- **Connection pooling:** Reemplazar la conexión directa de SQLAlchemy por PgBouncer o el pool async de asyncpg para manejar miles de conexiones concurrentes sin agotar los recursos de PostgreSQL.
- **Índices estratégicos:** Los campos `sender_id`, `receiver_id` y `created_at` ya tienen índices implícitos por las FK y la query de listado. Para consultas analíticas (el gráfico de tendencias) se añadiría un índice compuesto `(sender_id, created_at DESC, status)`.
- **Read replicas:** Las queries de lectura (listado, dashboard) se derivarían a una réplica de PostgreSQL, liberando la instancia primaria para escrituras.

**Nivel de backend:**
- **Migrar a SQLAlchemy async:** Los endpoints actuales usan SQLAlchemy síncrono dentro de funciones `async`. Para escala real se necesita `AsyncSession` con `asyncpg` para no bloquear el event loop en cada query.
- **Workers múltiples:** `uvicorn --workers 4` (o Gunicorn + Uvicorn workers) para usar todos los núcleos del servidor.
- **Separar el servicio de tipo de cambio:** Extraer la consulta a Frankfurter a un microservicio independiente con su propio caché Redis TTL=1min. Así el endpoint `confirm` no depende de la latencia de red a la API externa.
- **Cola de trabajo:** Las confirmaciones podrían procesarse de forma asíncrona con Celery + Redis para no bloquear la respuesta HTTP y garantizar reintentos automáticos si Frankfurter falla.

**Nivel de frontend:**
- El code-splitting actual (recharts en chunk separado) ya prepara la app para carga eficiente. Para escala, se añadiría **React Query** o **SWR** para caché de peticiones con invalidación inteligente (en lugar del `refetch` manual actual).
- Las imágenes y assets estáticos se servirían desde un CDN (CloudFront, Cloudflare) para reducir la latencia global.

**Nivel de infraestructura:**
- Migrar `docker-compose` a **Kubernetes** (o ECS en AWS) para orquestación con autoscaling horizontal basado en uso de CPU/memoria.
- Añadir un **API Gateway** (Kong, AWS API GW) que centralice rate limiting, autenticación, logging y circuit breaking antes de llegar al backend.
- **Observabilidad:** OpenTelemetry para trazas distribuidas, Prometheus + Grafana para métricas, y un sistema centralizado de logs (Loki, DataDog) para correlacionar errores de la API externa con fallos de confirmación.
