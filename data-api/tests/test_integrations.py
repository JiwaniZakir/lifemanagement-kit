"""Tests for integration client instantiation and patterns."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest


def test_base_integration_is_abstract():
    """BaseIntegration should not be directly instantiable."""
    from app.integrations.base import BaseIntegration

    with pytest.raises(TypeError):
        BaseIntegration("user", AsyncMock())  # type: ignore[abstract]


def test_all_clients_follow_base_pattern():
    """All integration clients should inherit from BaseIntegration."""
    from app.integrations.base import BaseIntegration
    from app.integrations.blackboard_client import BlackboardClient
    from app.integrations.canvas_client import CanvasClient
    from app.integrations.garmin_client import GarminClient
    from app.integrations.google_calendar_client import GoogleCalendarClient
    from app.integrations.linkedin_client import LinkedInClient
    from app.integrations.outlook_calendar_client import OutlookCalendarClient
    from app.integrations.schwab_client import SchwabClient
    from app.integrations.x_client import XClient

    clients = [
        CanvasClient,
        GarminClient,
        GoogleCalendarClient,
        SchwabClient,
        BlackboardClient,
        OutlookCalendarClient,
        LinkedInClient,
        XClient,
    ]
    for cls in clients:
        assert issubclass(cls, BaseIntegration), f"{cls.__name__} not a BaseIntegration"


def test_all_clients_implement_sync_and_health_check():
    """All integration clients must implement sync() and health_check()."""
    from app.integrations.blackboard_client import BlackboardClient
    from app.integrations.canvas_client import CanvasClient
    from app.integrations.garmin_client import GarminClient
    from app.integrations.google_calendar_client import GoogleCalendarClient
    from app.integrations.linkedin_client import LinkedInClient
    from app.integrations.outlook_calendar_client import OutlookCalendarClient
    from app.integrations.schwab_client import SchwabClient
    from app.integrations.x_client import XClient

    clients = [
        CanvasClient,
        GarminClient,
        GoogleCalendarClient,
        SchwabClient,
        BlackboardClient,
        OutlookCalendarClient,
        LinkedInClient,
        XClient,
    ]
    for cls in clients:
        assert hasattr(cls, "sync"), f"{cls.__name__} missing sync()"
        assert hasattr(cls, "health_check"), f"{cls.__name__} missing health_check()"
        assert callable(cls.sync), f"{cls.__name__}.sync not callable"
        assert callable(cls.health_check), f"{cls.__name__}.health_check not callable"


def test_plaid_client_requires_library():
    """PlaidClient should raise when plaid-python is not installed."""
    from app.integrations.plaid_client import PLAID_AVAILABLE, PlaidUnavailableError

    if not PLAID_AVAILABLE:
        with pytest.raises(PlaidUnavailableError):
            from app.integrations.plaid_client import PlaidClient

            PlaidClient("user", AsyncMock())


def test_canvas_client_instantiation():
    """CanvasClient should instantiate with user_id and db session."""
    from app.integrations.canvas_client import CanvasClient

    db = AsyncMock()
    c = CanvasClient("user-123", db)
    assert c.user_id == "user-123"


def test_garmin_client_instantiation():
    """GarminClient should instantiate (or raise if garminconnect missing)."""
    from app.integrations.garmin_client import GARMIN_AVAILABLE, GarminClient, GarminClientError

    db = AsyncMock()
    if GARMIN_AVAILABLE:
        g = GarminClient("user-123", db)
        assert g.user_id == "user-123"
    else:
        with pytest.raises(GarminClientError):
            GarminClient("user-123", db)
