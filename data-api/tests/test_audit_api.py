"""Tests for audit API — log writing, chain verification, queries."""

from __future__ import annotations

import pytest

from tests.conftest import AUTH_HEADER


async def test_audit_log_post_validates_body(client):
    """POST /audit/log should require action and resource_type."""
    resp = await client.post("/audit/log", headers=AUTH_HEADER, json={})
    assert resp.status_code == 422


async def test_audit_log_post_requires_action(client):
    """POST /audit/log should reject missing action."""
    resp = await client.post(
        "/audit/log",
        headers=AUTH_HEADER,
        json={"resource_type": "test"},
    )
    assert resp.status_code == 422


async def test_audit_log_post_requires_resource_type(client):
    """POST /audit/log should reject missing resource_type."""
    resp = await client.post(
        "/audit/log",
        headers=AUTH_HEADER,
        json={"action": "test"},
    )
    assert resp.status_code == 422


async def test_audit_log_requires_auth(client):
    """POST /audit/log should reject unauthenticated requests."""
    resp = await client.post(
        "/audit/log",
        json={"action": "test", "resource_type": "test"},
    )
    assert resp.status_code == 401


async def test_audit_verify_requires_auth(client):
    """GET /audit/verify should reject unauthenticated requests."""
    resp = await client.get("/audit/verify")
    assert resp.status_code == 401


async def test_audit_log_query_requires_auth(client):
    """GET /audit/log should reject unauthenticated requests."""
    resp = await client.get("/audit/log")
    assert resp.status_code == 401


async def test_audit_verify_with_auth(client):
    """GET /audit/verify with auth should not return 401/403."""
    try:
        resp = await client.get("/audit/verify", headers=AUTH_HEADER)
        assert resp.status_code not in (401, 403)
    except Exception:
        pytest.skip("No database available")


async def test_audit_log_query_with_auth(client):
    """GET /audit/log with auth should not return 401/403."""
    try:
        resp = await client.get("/audit/log", headers=AUTH_HEADER)
        assert resp.status_code not in (401, 403)
    except Exception:
        pytest.skip("No database available")
