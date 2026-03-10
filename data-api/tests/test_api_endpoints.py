"""Tests for API endpoint routing and auth enforcement."""

from __future__ import annotations

import pytest

from tests.conftest import AUTH_HEADER

# --- Auth enforcement: every protected route rejects missing/bad tokens ---

_PROTECTED_ROUTES = [
    ("GET", "/credentials/default"),
    ("GET", "/finance/balances"),
    ("GET", "/finance/transactions"),
    ("GET", "/calendar/today"),
    ("GET", "/calendar/events"),
    ("GET", "/calendar/free"),
    ("GET", "/lms/courses"),
    ("GET", "/lms/due"),
    ("GET", "/lms/grades"),
    ("GET", "/health/today"),
    ("GET", "/health/summary"),
    ("POST", "/social/post"),
    ("GET", "/audit/verify"),
    ("GET", "/audit/log"),
    ("GET", "/budget/usage"),
    ("GET", "/briefing/today"),
    ("GET", "/briefing/weekly"),
    ("GET", "/briefing/insights"),
    ("POST", "/content/generate"),
    ("GET", "/content/drafts"),
    ("GET", "/content/queue"),
    ("GET", "/spotify/plays/recent"),
    ("GET", "/spotify/plays/stats"),
    ("GET", "/spotify/top"),
    ("POST", "/spotify/sync"),
]


@pytest.mark.parametrize("method,path", _PROTECTED_ROUTES)
async def test_protected_routes_reject_no_auth(client, method, path):
    """All protected routes should return 401 without auth."""
    resp = await getattr(client, method.lower())(path)
    assert resp.status_code == 401, f"{method} {path} returned {resp.status_code}"


@pytest.mark.parametrize("method,path", _PROTECTED_ROUTES)
async def test_protected_routes_reject_bad_token(client, method, path):
    """All protected routes should return 403 with wrong token."""
    resp = await getattr(client, method.lower())(path, headers={"Authorization": "Bearer wrong"})
    assert resp.status_code == 403, f"{method} {path} returned {resp.status_code}"


# --- Health endpoint (no auth required) ---


async def test_health_returns_ok(client):
    """Health endpoint should work without auth."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "aegis-data-api"


async def test_docs_available_in_dev(client):
    """OpenAPI docs should be available in development mode."""
    resp = await client.get("/openapi.json")
    assert resp.status_code == 200
    data = resp.json()
    assert "paths" in data
    assert "/health" in data["paths"]


# --- Budget endpoint ---


async def test_budget_record_validates_body(client):
    """POST /budget/record should validate request body."""
    resp = await client.post(
        "/budget/record",
        headers=AUTH_HEADER,
        json={},  # Missing required fields
    )
    assert resp.status_code == 422


async def test_budget_cost_estimation():
    """Cost estimation should match expected pricing."""
    from app.api.budget import _estimate_cost

    # claude-sonnet-4-6: $3.00 input, $15.00 output per 1M
    cost = _estimate_cost("claude-sonnet-4-6", 1_000_000, 0)
    assert float(cost) == pytest.approx(3.0, abs=0.01)

    cost = _estimate_cost("claude-sonnet-4-6", 0, 1_000_000)
    assert float(cost) == pytest.approx(15.0, abs=0.01)

    # claude-haiku-4-5: $0.80 input, $4.00 output per 1M
    cost = _estimate_cost("claude-haiku-4-5", 1_000_000, 1_000_000)
    assert float(cost) == pytest.approx(4.8, abs=0.01)


async def test_budget_alerts():
    """Budget alert thresholds should trigger correctly."""
    from app.api.budget import _check_alerts

    # Under 80% — no alerts
    assert _check_alerts(3.0, 5.0, 30.0, 50.0) == []

    # At 80% daily
    assert "DAILY_80_PCT" in _check_alerts(4.0, 5.0, 30.0, 50.0)

    # At 95% daily
    assert "DAILY_95_PCT" in _check_alerts(4.8, 5.0, 30.0, 50.0)

    # Exceeded daily
    assert "DAILY_BUDGET_EXCEEDED" in _check_alerts(5.5, 5.0, 30.0, 50.0)

    # Monthly 80%
    assert "MONTHLY_80_PCT" in _check_alerts(1.0, 5.0, 40.0, 50.0)

    # Monthly exceeded
    assert "MONTHLY_BUDGET_EXCEEDED" in _check_alerts(1.0, 5.0, 55.0, 50.0)


# --- Social endpoint ---


async def test_social_post_validates_body(client):
    """POST /social/post should validate request body."""
    resp = await client.post(
        "/social/post",
        headers=AUTH_HEADER,
        json={},  # Missing required fields
    )
    assert resp.status_code == 422


async def test_social_post_rejects_unknown_platform(client):
    """POST /social/post should reject unknown platforms."""
    resp = await client.post(
        "/social/post",
        headers=AUTH_HEADER,
        json={"platform": "tiktok", "content": "test"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is False
    assert "Unknown platform" in data["error"]
