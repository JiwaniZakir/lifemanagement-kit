"""Tests for budget API — usage recording, cost estimation, alerts."""

from __future__ import annotations

import pytest

from tests.conftest import AUTH_HEADER


async def test_budget_record_requires_model(client):
    """POST /budget/record should require model field."""
    resp = await client.post(
        "/budget/record",
        headers=AUTH_HEADER,
        json={"input_tokens": 100, "output_tokens": 50},
    )
    assert resp.status_code == 422


async def test_budget_record_requires_tokens(client):
    """POST /budget/record should require token counts."""
    resp = await client.post(
        "/budget/record",
        headers=AUTH_HEADER,
        json={"model": "claude-sonnet-4-6"},
    )
    assert resp.status_code == 422


async def test_budget_usage_requires_auth(client):
    """GET /budget/usage should reject unauthenticated requests."""
    resp = await client.get("/budget/usage")
    assert resp.status_code == 401


async def test_budget_record_requires_auth(client):
    """POST /budget/record should reject unauthenticated requests."""
    resp = await client.post(
        "/budget/record",
        json={"model": "claude-sonnet-4-6", "input_tokens": 100, "output_tokens": 50},
    )
    assert resp.status_code == 401


async def test_cost_estimation_unknown_model():
    """Unknown models should fall back to sonnet pricing."""
    from app.api.budget import _estimate_cost

    cost = _estimate_cost("unknown-model", 1_000_000, 0)
    assert float(cost) == pytest.approx(3.0, abs=0.01)


async def test_cost_estimation_zero_tokens():
    """Zero tokens should cost zero."""
    from app.api.budget import _estimate_cost

    cost = _estimate_cost("claude-sonnet-4-6", 0, 0)
    assert float(cost) == 0.0


async def test_cost_estimation_opus():
    """Opus pricing should be correct ($15/$75 per 1M)."""
    from app.api.budget import _estimate_cost

    cost = _estimate_cost("claude-opus-4-6", 1_000_000, 1_000_000)
    assert float(cost) == pytest.approx(90.0, abs=0.01)


async def test_alerts_no_alert_under_threshold():
    """Below 80% usage should produce no alerts."""
    from app.api.budget import _check_alerts

    assert _check_alerts(0.0, 5.0, 0.0, 50.0) == []
    assert _check_alerts(3.9, 5.0, 39.0, 50.0) == []


async def test_alerts_multiple_thresholds():
    """Both daily and monthly alerts should fire independently."""
    from app.api.budget import _check_alerts

    alerts = _check_alerts(5.5, 5.0, 55.0, 50.0)
    assert "DAILY_BUDGET_EXCEEDED" in alerts
    assert "MONTHLY_BUDGET_EXCEEDED" in alerts


async def test_alerts_monthly_95_pct():
    """Monthly 95% threshold should trigger."""
    from app.api.budget import _check_alerts

    alerts = _check_alerts(1.0, 5.0, 47.5, 50.0)
    assert "MONTHLY_95_PCT" in alerts
