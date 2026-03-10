"""Spotify Web API integration — listening history and top items."""

from __future__ import annotations

import json
import time
from typing import Any

import httpx
import structlog
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.integrations.base import BaseIntegration
from app.models.listening_history import ListeningHistory, SpotifyTopSnapshot

logger = structlog.get_logger()

SPOTIFY_API_BASE = "https://api.spotify.com/v1"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"  # noqa: S105


class SpotifyClientError(RuntimeError):
    pass


class SpotifyClient(BaseIntegration):

    def __init__(self, user_id: str, db: AsyncSession) -> None:
        super().__init__(user_id, db)
        self._access_token: str | None = None

    async def _refresh_access_token(self) -> str:
        refresh_token = await self.get_credential("spotify_refresh_token")
        client_id = await self.get_credential("spotify_client_id")
        client_secret = await self.get_credential("spotify_client_secret")

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                SPOTIFY_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()

        access_token = data["access_token"]
        self._access_token = access_token

        if "refresh_token" in data:
            await self.store_credential("spotify_refresh_token", data["refresh_token"])

        self._log.debug("spotify_token_refreshed")
        return access_token

    async def _get_token(self) -> str:
        if self._access_token:
            return self._access_token
        return await self._refresh_access_token()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPStatusError),
        reraise=True,
    )
    async def _api_get(self, path: str, params: dict[str, Any] | None = None) -> dict:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{SPOTIFY_API_BASE}{path}",
                params=params,
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 401:  # noqa: PLR2004
                token = await self._refresh_access_token()
                resp = await client.get(
                    f"{SPOTIFY_API_BASE}{path}",
                    params=params,
                    headers={"Authorization": f"Bearer {token}"},
                )
            resp.raise_for_status()
            return resp.json()

    async def get_recently_played(self, limit: int = 50) -> list[dict]:
        data = await self._api_get("/me/player/recently-played", {"limit": limit})
        return data.get("items", [])

    async def get_top_items(
        self, item_type: str = "tracks", time_range: str = "medium_term", limit: int = 50
    ) -> list[dict]:
        data = await self._api_get(
            f"/me/top/{item_type}",
            {"time_range": time_range, "limit": limit},
        )
        return data.get("items", [])

    async def sync(self) -> None:
        items = await self.get_recently_played(limit=50)
        inserted = 0
        skipped = 0

        for item in items:
            track = item.get("track", {})
            artists = track.get("artists", [{}])
            album = track.get("album", {})
            played_at = item.get("played_at", "")
            context = item.get("context")

            try:
                played_at_ts = int(
                    time.mktime(time.strptime(played_at[:19], "%Y-%m-%dT%H:%M:%S")) * 1000
                )
            except (ValueError, TypeError):
                played_at_ts = int(time.time() * 1000)

            stmt = (
                pg_insert(ListeningHistory)
                .values(
                    user_id=self.user_id,
                    spotify_track_id=track.get("id", ""),
                    spotify_artist_id=artists[0].get("id", "") if artists else "",
                    spotify_album_id=album.get("id", ""),
                    spotify_context_uri=context.get("uri") if context else None,
                    track_name=track.get("name", ""),
                    artist_name=artists[0].get("name", "") if artists else "",
                    album_name=album.get("name", ""),
                    played_at_utc=played_at,
                    played_at_ts=played_at_ts,
                    duration_ms=track.get("duration_ms", 0),
                    explicit=track.get("explicit", False),
                    popularity=track.get("popularity", 0),
                    context_type=context.get("type") if context else None,
                )
                .on_conflict_do_nothing(index_elements=["user_id", "played_at_utc"])
            )
            result = await self.db.execute(stmt)
            if result.rowcount == 1:
                inserted += 1
            else:
                skipped += 1

        for snapshot_type in ("tracks", "artists"):
            for time_range in ("short_term", "medium_term", "long_term"):
                try:
                    top_items = await self.get_top_items(snapshot_type, time_range, limit=50)
                    snapshot = SpotifyTopSnapshot(
                        user_id=self.user_id,
                        snapshot_type=snapshot_type,
                        time_range=time_range,
                        items_json=json.dumps(top_items),
                        item_count=len(top_items),
                    )
                    self.db.add(snapshot)
                except httpx.HTTPStatusError:
                    self._log.warning(
                        "spotify_top_fetch_failed",
                        snapshot_type=snapshot_type,
                        time_range=time_range,
                    )

        await self.db.flush()
        await self._audit(
            action="spotify_sync",
            resource_type="spotify",
            metadata={"inserted": inserted, "skipped": skipped},
        )
        self._log.info("spotify_sync_complete", inserted=inserted, skipped=skipped)

    async def health_check(self) -> bool:
        try:
            await self._api_get("/me")
            return True
        except (httpx.HTTPStatusError, SpotifyClientError):
            return False
