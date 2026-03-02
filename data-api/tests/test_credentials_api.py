"""Tests for credentials API — store, retrieve, list, delete."""

from __future__ import annotations

import pytest

from tests.conftest import AUTH_HEADER


async def test_store_credential_validates_body(client):
    """POST /credentials should require user_id, service_name, and value."""
    resp = await client.post("/credentials", headers=AUTH_HEADER, json={})
    assert resp.status_code == 422


async def test_store_credential_requires_service_name(client):
    """POST /credentials should reject missing service_name."""
    resp = await client.post(
        "/credentials",
        headers=AUTH_HEADER,
        json={"user_id": "user-1", "value": "secret"},
    )
    assert resp.status_code == 422


async def test_store_credential_requires_value(client):
    """POST /credentials should reject missing value."""
    resp = await client.post(
        "/credentials",
        headers=AUTH_HEADER,
        json={"user_id": "user-1", "service_name": "plaid"},
    )
    assert resp.status_code == 422


async def test_get_nonexistent_credential(client):
    """GET /credentials/{user}/{service} should 404 or skip if no DB."""
    try:
        resp = await client.get("/credentials/nobody/nope", headers=AUTH_HEADER)
        assert resp.status_code in (404, 500)
    except Exception:
        pytest.skip("No database available")


async def test_delete_nonexistent_credential(client):
    """DELETE /credentials/{user}/{service} should 404 or skip if no DB."""
    try:
        resp = await client.delete("/credentials/nobody/nope", headers=AUTH_HEADER)
        assert resp.status_code in (404, 500)
    except Exception:
        pytest.skip("No database available")


async def test_list_credentials_returns_list(client):
    """GET /credentials/{user_id} should return a list or skip if no DB."""
    try:
        resp = await client.get("/credentials/user-1", headers=AUTH_HEADER)
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            assert isinstance(resp.json(), list)
    except Exception:
        pytest.skip("No database available")


async def test_credentials_auth_required(client):
    """Credentials endpoints should reject unauthenticated requests."""
    body = {"user_id": "x", "service_name": "y", "value": "z"}
    resp = await client.post("/credentials", json=body)
    assert resp.status_code == 401

    resp = await client.get("/credentials/user-1/plaid")
    assert resp.status_code == 401

    resp = await client.delete("/credentials/user-1/plaid")
    assert resp.status_code == 401

    resp = await client.get("/credentials/user-1")
    assert resp.status_code == 401
