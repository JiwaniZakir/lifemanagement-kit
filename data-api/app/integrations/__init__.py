"""External API integration clients for the Aegis data-api."""

from __future__ import annotations

from app.integrations.base import BaseIntegration
from app.integrations.blackboard_client import BlackboardClient
from app.integrations.canvas_client import CanvasClient
from app.integrations.garmin_client import GarminClient
from app.integrations.google_calendar_client import GoogleCalendarClient
from app.integrations.linkedin_client import LinkedInClient
from app.integrations.outlook_calendar_client import OutlookCalendarClient
from app.integrations.plaid_client import PlaidClient
from app.integrations.schwab_client import SchwabClient
from app.integrations.spotify_client import SpotifyClient
from app.integrations.x_client import XClient

__all__ = [
    "BaseIntegration",
    "BlackboardClient",
    "CanvasClient",
    "GarminClient",
    "GoogleCalendarClient",
    "LinkedInClient",
    "OutlookCalendarClient",
    "PlaidClient",
    "SchwabClient",
    "SpotifyClient",
    "XClient",
]
