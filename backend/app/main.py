import hmac
from datetime import datetime
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_session
from app.services import pea

settings = get_settings()

DbSession = Annotated[Session, Depends(get_session)]

app = FastAPI(title="Trading Advisor API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def require_api_token(request: Request, call_next):
    """Once the API is reachable from the internet (API_TOKEN set), only the site may call it."""
    token = settings.api_token
    if token and request.url.path != "/health":
        sent = request.headers.get("x-api-token", "")
        if not hmac.compare_digest(sent.encode(), token.encode()):
            return JSONResponse({"detail": "Jeton d'API manquant ou invalide."}, status_code=401)
    return await call_next(request)


@app.get("/health")
def health(session: DbSession) -> dict[str, str]:
    try:
        session.execute(text("SELECT 1"))
        database = "ok"
    except SQLAlchemyError:
        database = "indisponible"
    return {"status": "ok", "database": database, "broker_env": settings.broker_env}


# --- PEA ETF portfolio ------------------------------------------------------------------------


@app.get("/pea")
def get_pea(session: DbSession) -> dict[str, object]:
    return pea.view(session)


@app.get("/pea/alert")
def get_pea_alert(session: DbSession) -> dict[str, object]:
    return pea.alert(session, datetime.now(ZoneInfo("Europe/Paris")).date())
