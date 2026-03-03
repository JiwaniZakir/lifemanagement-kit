"""Shared test fixtures for Aegis data-api."""

from __future__ import annotations

import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault(
    "DATA_API_TOKEN",
    "test_data_api_token_0123456789abcdef",
)
os.environ.setdefault(
    "ENCRYPTION_MASTER_KEY",
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
)
os.environ.setdefault("POSTGRES_PASSWORD", "test")

from app.main import app  # noqa: E402

AUTH_HEADER = {"Authorization": "Bearer test_data_api_token_0123456789abcdef"}


@pytest.fixture(scope="session", autouse=True)
async def _reset_db_engine():
    """Recreate the SQLAlchemy engine on the test event loop.

    The engine is created at module-import time (before any test loop exists).
    When a real Postgres is available (CI), connections bind to that import-time
    loop, causing 'Future attached to a different loop' errors.  Disposing and
    recreating here ensures the pool lives on the session-scoped test loop.
    """
    from app import database

    await database.engine.dispose()
    database.engine = create_async_engine(
        database.settings.async_database_url,
        echo=False,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )
    database.async_session_factory = async_sessionmaker(
        database.engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    yield
    await database.engine.dispose()


@pytest.fixture
def master_key() -> bytes:
    return bytes.fromhex("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
