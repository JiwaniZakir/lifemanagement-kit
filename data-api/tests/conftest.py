"""Shared test fixtures for Aegis data-api."""

from __future__ import annotations

import asyncio
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


@pytest.fixture(scope="session")
def event_loop():
    """Use a single event loop for all tests.

    The SQLAlchemy engine is created at import time and binds its connection
    pool to the running loop on first use.  Sharing one loop across the
    entire test session avoids 'Future attached to a different loop' errors
    when tests hit real Postgres (CI).
    """
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def _reset_db_engine():
    """Recreate the SQLAlchemy engine on the test event loop."""
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
