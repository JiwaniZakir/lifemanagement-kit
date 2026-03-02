"""Outlook Calendar client — Microsoft Graph API v1.0."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.integrations.base import BaseIntegration

_GRAPH_BASE = "https://graph.microsoft.com/v1.0"


class OutlookCalendarClient(BaseIntegration):
    """Microsoft Graph Calendar API integration.

    Requires Azure AD app with ``Calendars.Read`` delegated permission.
    Stores OAuth refresh token as an encrypted credential.
    """

    async def _get_access_token(self) -> str:
        refresh = await self.get_credential("outlook_refresh_token")
        settings = get_settings()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"https://login.microsoftonline.com/{settings.azure_tenant_id}/oauth2/v2.0/token",
                data={
                    "grant_type": "refresh_token",
                    "client_id": settings.azure_client_id,
                    "client_secret": settings.azure_client_secret,
                    "refresh_token": refresh,
                    "scope": "https://graph.microsoft.com/.default",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        if "refresh_token" in data:
            await self.store_credential("outlook_refresh_token", data["refresh_token"])

        return data["access_token"]

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.TimeoutException),
        reraise=True,
    )
    async def _api_request(self, path: str, *, params: dict | None = None) -> dict:
        token = await self._get_access_token()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{_GRAPH_BASE}{path}",
                headers={"Authorization": f"Bearer {token}"},
                params=params,
            )
            if resp.status_code == 401:
                token = await self._get_access_token()
                resp = await client.get(
                    f"{_GRAPH_BASE}{path}",
                    headers={"Authorization": f"Bearer {token}"},
                    params=params,
                )
            resp.raise_for_status()
            return resp.json()

    async def get_today_events(self) -> list[dict]:
        """Fetch all events for today via Microsoft Graph."""
        now = datetime.now(UTC)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        return await self.get_events(start=day_start, end=day_end)

    async def get_events(
        self,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> list[dict]:
        """Fetch calendar events in a time range via Microsoft Graph."""
        now = datetime.now(UTC)
        start = start or now
        end = end or now + timedelta(days=7)

        data = await self._api_request(
            "/me/calendarview",
            params={
                "startDateTime": start.isoformat(),
                "endDateTime": end.isoformat(),
                "$orderby": "start/dateTime",
                "$top": "50",
                "$select": "subject,start,end,location,isAllDay,organizer",
            },
        )
        return [
            {
                "title": e.get("subject", ""),
                "start": e.get("start", {}).get("dateTime", ""),
                "end": e.get("end", {}).get("dateTime", ""),
                "location": (e.get("location") or {}).get("displayName", ""),
                "all_day": e.get("isAllDay", False),
                "organizer": (e.get("organizer", {}).get("emailAddress", {}).get("address", "")),
                "source": "outlook",
            }
            for e in data.get("value", [])
        ]

    async def sync(self) -> dict[str, Any]:
        """Pull events from Outlook Calendar."""
        events = await self.get_events()
        await self._audit(
            action="outlook_sync",
            resource_type="calendar",
            metadata={"events": len(events)},
        )
        return {"ok": True, "events": len(events)}

    async def health_check(self) -> bool:
        """Verify Microsoft Graph API connectivity."""
        try:
            await self._api_request("/me")
            return True
        except Exception:
            return False
