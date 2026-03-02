"""Aegis data-api — Minimal encrypted data persistence for OpenClaw agents."""

from __future__ import annotations

import hmac
import time
import uuid

import structlog
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.audit import router as audit_router
from app.api.briefing import router as briefing_router
from app.api.budget import router as budget_router
from app.api.calendar import router as calendar_router
from app.api.content import router as content_router
from app.api.credentials import router as credentials_router
from app.api.finance import router as finance_router
from app.api.health import router as health_router
from app.api.lms import router as lms_router
from app.api.social import router as social_router
from app.config import get_settings
from app.database import async_session_factory
from app.logging import configure_logging
from app.security.audit import audit_log

configure_logging()
logger = structlog.get_logger()

_bearer = HTTPBearer(auto_error=False)


async def verify_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """Validate the Bearer token for all data-api requests.

    Single machine-to-machine caller (OpenClaw). Constant-time comparison.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    settings = get_settings()
    expected = settings.data_api_token
    if not hmac.compare_digest(credentials.credentials, expected):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid token",
        )
    return "authenticated"


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    is_prod = settings.environment == "production"
    app = FastAPI(
        title="Aegis Data API",
        description="Encrypted data persistence for OpenClaw agents",
        version="0.1.0",
        docs_url=None if is_prod else "/docs",
        redoc_url=None if is_prod else "/redoc",
        openapi_url=None if is_prod else "/openapi.json",
    )

    @app.middleware("http")
    async def audit_middleware(request: Request, call_next: object) -> Response:
        """Log every API request to the audit table."""
        start = time.monotonic()
        request_id = str(uuid.uuid4())
        structlog.contextvars.bind_contextvars(request_id=request_id)

        response: Response = await call_next(request)  # type: ignore[call-arg]
        elapsed_ms = round((time.monotonic() - start) * 1000)

        if request.url.path not in {"/health", "/docs", "/redoc", "/openapi.json"}:
            try:
                async with async_session_factory() as session:
                    await audit_log(
                        session,
                        action=request.method,
                        resource_type="api",
                        resource_id=request.url.path,
                        ip_address=request.client.host if request.client else None,
                        metadata={
                            "status_code": response.status_code,
                            "elapsed_ms": elapsed_ms,
                            "request_id": request_id,
                        },
                    )
                    await session.commit()
            except Exception:
                logger.error("audit_write_failed", path=request.url.path)

        logger.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            elapsed_ms=elapsed_ms,
        )

        structlog.contextvars.unbind_contextvars("request_id")
        return response

    @app.exception_handler(ValueError)
    async def _validation_error(request: Request, exc: ValueError) -> JSONResponse:
        logger.warning("validation_error", error=str(exc), path=request.url.path)
        return JSONResponse(status_code=400, content={"detail": "Invalid input"})

    @app.exception_handler(Exception)
    async def _unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        logger.error("unhandled_error", error=type(exc).__name__, path=request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    @app.get("/health")
    async def health_check() -> dict[str, str]:
        return {"status": "ok", "service": "aegis-data-api"}

    # All routers require Bearer token auth
    app.include_router(
        credentials_router, prefix="/credentials", dependencies=[Depends(verify_token)]
    )
    app.include_router(finance_router, prefix="/finance", dependencies=[Depends(verify_token)])
    app.include_router(calendar_router, prefix="/calendar", dependencies=[Depends(verify_token)])
    app.include_router(lms_router, prefix="/lms", dependencies=[Depends(verify_token)])
    app.include_router(health_router, prefix="/health", dependencies=[Depends(verify_token)])
    app.include_router(social_router, prefix="/social", dependencies=[Depends(verify_token)])
    app.include_router(audit_router, prefix="/audit", dependencies=[Depends(verify_token)])
    app.include_router(budget_router, prefix="/budget", dependencies=[Depends(verify_token)])
    app.include_router(briefing_router, prefix="/briefing", dependencies=[Depends(verify_token)])
    app.include_router(content_router, prefix="/content", dependencies=[Depends(verify_token)])

    return app


app = create_app()
