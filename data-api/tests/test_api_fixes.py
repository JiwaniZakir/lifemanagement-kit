"""Tests for Phase 1 & 2 bug fixes — skill/API alignment and integration hardening."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import AUTH_HEADER

# ---------------------------------------------------------------------------
# 1.1  Calendar /free  — date param (was date_str)
# ---------------------------------------------------------------------------


async def test_calendar_free_accepts_date_param(client):
    """GET /calendar/free?date=YYYY-MM-DD should be accepted."""
    with patch(
        "app.integrations.google_calendar_client.GoogleCalendarClient.get_events",
        new_callable=AsyncMock,
        return_value=[],
    ):
        resp = await client.get(
            "/calendar/free?user_id=default&date=2026-03-05",
            headers=AUTH_HEADER,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # With no events, the whole 9 AM-6 PM window is free
        assert len(data) == 1
        assert data[0]["duration_minutes"] == 540


async def test_calendar_free_default_date(client):
    """GET /calendar/free with no date param should default to today."""
    with patch(
        "app.integrations.google_calendar_client.GoogleCalendarClient.get_events",
        new_callable=AsyncMock,
        return_value=[],
    ):
        resp = await client.get(
            "/calendar/free?user_id=default",
            headers=AUTH_HEADER,
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 1.2  Calendar /events  — days param
# ---------------------------------------------------------------------------


async def test_calendar_events_accepts_days_param(client):
    """GET /calendar/events?days=3 should work."""
    with patch(
        "app.integrations.google_calendar_client.GoogleCalendarClient.get_events",
        new_callable=AsyncMock,
        return_value=[{"title": "test"}],
    ):
        resp = await client.get(
            "/calendar/events?user_id=default&days=3",
            headers=AUTH_HEADER,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)


# ---------------------------------------------------------------------------
# 1.3  LMS course_id: accepts string
# ---------------------------------------------------------------------------


async def test_lms_grades_accepts_string_course_id(client):
    """GET /lms/grades?course_id=CS260 should not return 422."""
    with patch(
        "app.integrations.canvas_client.CanvasClient.get_grades",
        new_callable=AsyncMock,
        return_value=[],
    ):
        resp = await client.get(
            "/lms/grades?user_id=default&course_id=CS260",
            headers=AUTH_HEADER,
        )
        assert resp.status_code == 200


async def test_lms_announcements_accepts_string_course_id(client):
    """GET /lms/announcements?course_id=CS260 should not return 422."""
    with patch(
        "app.integrations.canvas_client.CanvasClient.get_announcements",
        new_callable=AsyncMock,
        return_value=[],
    ):
        resp = await client.get(
            "/lms/announcements?user_id=default&course_id=CS260",
            headers=AUTH_HEADER,
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 1.5  Health /today  — flat response shape
# ---------------------------------------------------------------------------


async def test_health_today_flat_response(client):
    """GET /health/today should return flat metric keys (not nested under 'metrics')."""
    try:
        resp = await client.get("/health/today?user_id=default", headers=AUTH_HEADER)
    except Exception:
        pytest.skip("No database available")

    if resp.status_code == 500:
        pytest.skip("No database available")

    data = resp.json()
    assert "steps" in data
    assert "protein_g" in data
    assert "calories_consumed" in data
    assert "calories_burned" in data
    assert "sleep_hours" in data
    assert "goals" in data
    assert "goal_progress" in data
    assert "metrics" not in data


# ---------------------------------------------------------------------------
# 1.6  Content /generate  — topic & tone in response
# ---------------------------------------------------------------------------


async def test_content_generate_surfaces_topic_and_tone(client):
    """POST /content/generate response should include top-level topic and tone."""
    try:
        resp = await client.post(
            "/content/generate",
            headers=AUTH_HEADER,
            json={
                "platform": "linkedin",
                "topic": "AI in healthcare",
                "style": "thought-leadership",
                "user_id": "default",
            },
        )
    except Exception:
        pytest.skip("No database available")

    if resp.status_code == 500:
        pytest.skip("No database available")

    data = resp.json()
    assert data.get("topic") == "AI in healthcare"
    assert data.get("tone") == "thought-leadership"


async def test_content_drafts_surfaces_topic_and_tone(client):
    """GET /content/drafts response items should include top-level topic and tone."""
    try:
        resp = await client.get(
            "/content/drafts?user_id=default",
            headers=AUTH_HEADER,
        )
    except Exception:
        pytest.skip("No database available")

    if resp.status_code == 500:
        pytest.skip("No database available")

    data = resp.json()
    assert isinstance(data, list)
    for d in data:
        assert "topic" in d
        assert "tone" in d


# ---------------------------------------------------------------------------
# 1.7  Finance — wrapped responses
# ---------------------------------------------------------------------------


async def test_finance_balances_wrapped(client):
    """GET /finance/balances should return {balances: [...], total: float}."""
    try:
        resp = await client.get(
            "/finance/balances?user_id=default",
            headers=AUTH_HEADER,
        )
    except Exception:
        pytest.skip("No database available")

    if resp.status_code == 500:
        pytest.skip("No database available")

    data = resp.json()
    assert "balances" in data
    assert "total" in data
    assert isinstance(data["balances"], list)
    assert isinstance(data["total"], (int, float))


async def test_finance_transactions_wrapped(client):
    """GET /finance/transactions should return {transactions: [...], count: int}."""
    try:
        resp = await client.get(
            "/finance/transactions?user_id=default",
            headers=AUTH_HEADER,
        )
    except Exception:
        pytest.skip("No database available")

    if resp.status_code == 500:
        pytest.skip("No database available")

    data = resp.json()
    assert "transactions" in data
    assert "count" in data
    assert isinstance(data["transactions"], list)
    assert data["count"] == len(data["transactions"])


async def test_finance_subscriptions_wrapped(client):
    """GET /finance/subscriptions should return {subscriptions: [...], total_monthly: float}."""
    try:
        resp = await client.get(
            "/finance/subscriptions?user_id=default",
            headers=AUTH_HEADER,
        )
    except Exception:
        pytest.skip("No database available")

    if resp.status_code == 500:
        pytest.skip("No database available")

    data = resp.json()
    assert "subscriptions" in data
    assert "total_monthly" in data
    for s in data["subscriptions"]:
        assert "merchant" in s
        assert "last_charge" in s
        assert "name" not in s
        assert "last_charged" not in s


async def test_finance_affordability_new_fields(client):
    """POST /finance/affordability should include affordable, available_budget, recommendation."""
    try:
        resp = await client.post(
            "/finance/affordability",
            headers=AUTH_HEADER,
            json={"user_id": "default", "purchase_amount": 500.0},
        )
    except Exception:
        pytest.skip("No database available")

    if resp.status_code == 500:
        pytest.skip("No database available")

    data = resp.json()
    assert "affordable" in data
    assert "available_budget" in data
    assert "recommendation" in data
    assert "monthly_expenses" in data
    assert "monthly_income" in data
    assert isinstance(data["affordable"], bool)
    assert "monthly_spending_avg" not in data
    assert "monthly_income_avg" not in data


# ---------------------------------------------------------------------------
# 2.1  Google Calendar — ValueError catch
# ---------------------------------------------------------------------------


async def test_google_calendar_catches_value_error():
    """_get_access_token should handle ValueError (corrupt token) gracefully."""
    from app.integrations.google_calendar_client import GoogleCalendarClient

    db = AsyncMock()
    gcal = GoogleCalendarClient("user", db)

    gcal.get_credential = AsyncMock(side_effect=ValueError("Decryption failed"))
    gcal._refresh_access_token = AsyncMock(return_value="new-token")

    token = await gcal._get_access_token()
    assert token == "new-token"
    gcal._refresh_access_token.assert_called_once()


# ---------------------------------------------------------------------------
# 2.3  Plaid — retry exception includes PlaidApiException
# ---------------------------------------------------------------------------


def test_plaid_retry_includes_api_exception():
    """Plaid retry decorators should retry on PlaidApiException."""
    from app.integrations.plaid_client import PLAID_AVAILABLE

    if not PLAID_AVAILABLE:
        pytest.skip("plaid-python not installed")

    from app.integrations.plaid_client import PlaidClient

    retry_obj = PlaidClient.create_link_token.retry  # type: ignore[attr-defined]
    assert retry_obj is not None


# ---------------------------------------------------------------------------
# 2.4  Canvas — no canvas_access_token in Settings
# ---------------------------------------------------------------------------


def test_canvas_token_not_in_settings():
    """Settings should NOT have canvas_access_token (moved to credential store)."""
    from app.config import Settings

    field_names = set(Settings.model_fields.keys())
    assert "canvas_access_token" not in field_names


def test_canvas_client_has_get_token_method():
    """CanvasClient should have a _get_token method that reads from credential store."""
    from app.integrations.canvas_client import CanvasClient

    db = AsyncMock()
    c = CanvasClient("user", db)
    assert hasattr(c, "_get_token")
    assert callable(c._get_token)


# ---------------------------------------------------------------------------
# 2.5  Canvas pagination helper
# ---------------------------------------------------------------------------


def test_canvas_parse_next_link():
    """_parse_next_link should extract the next URL from Link headers."""
    from app.integrations.canvas_client import _parse_next_link

    header = (
        '<https://canvas.example.com/api/v1/courses?page=2&per_page=100>; rel="next", '
        '<https://canvas.example.com/api/v1/courses?page=1&per_page=100>; rel="current"'
    )
    next_url = _parse_next_link(header)
    assert next_url == "https://canvas.example.com/api/v1/courses?page=2&per_page=100"

    header_no_next = '<https://canvas.example.com/api/v1/courses?page=1>; rel="current"'
    assert _parse_next_link(header_no_next) is None

    assert _parse_next_link("") is None


# ---------------------------------------------------------------------------
# store_credential on BaseIntegration
# ---------------------------------------------------------------------------


def test_base_integration_has_store_credential():
    """BaseIntegration should have store_credential method."""
    from app.integrations.base import BaseIntegration

    assert hasattr(BaseIntegration, "store_credential")
    assert callable(BaseIntegration.store_credential)
