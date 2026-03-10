"""Spotify Web API integration — listening history, top artists/tracks."""

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

        if resp.status_code != 200:
            raise SpotifyClientError(f"Token refresh failed: {resp.status_code}")

        data = resp.json()
        self._access_token = data["access_token"]

        if new_refresh := data.get("refresh_token"):
            await self.store_credential("spotify_refresh_token", new_refresh)

        self._log.debug("spotify_token_refreshed")
        return self._access_token

    async def _ensure_token(self) -> str:
        if self._access_token is None:
            return await self._refresh_access_token()
        return self._access_token

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.TransportError),
        reraise=True,
    )
    async def _api_get(self, path: str, params: dict[str, Any] | None = None) -> dict:
        token = await self._ensure_token()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{SPOTIFY_API_BASE}{path}",
                params=params,
                headers={"Authorization": f"Bearer {token}"},
            )

        if resp.status_code == 401:
            token = await self._refresh_access_token()
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{SPOTIFY_API_BASE}{path}",
                    params=params,
                    headers={"Authorization": f"Bearer {token}"},
                )

        if resp.status_code != 200:
            raise SpotifyClientError(f"Spotify API error {resp.status_code}: {path}")

        return resp.json()

    async def get_recently_played(self, limit: int = 50) -> list[dict]:
        data = await self._api_get(
            "/me/player/recently-played",
            params={"limit": min(limit, 50)},
        )
        return data.get("items", [])

    async def get_top_items(
        self,
        item_type: str = "tracks",
        time_range: str = "medium_term",
        limit: int = 50,
    ) -> list[dict]:
        data = await self._api_get(
            f"/me/top/{item_type}",
            params={"time_range": time_range, "limit": min(limit, 50)},
        )
        return data.get("items", [])

    async def sync_recently_played(self) -> dict[str, int]:
        items = await self.get_recently_played(limit=50)
        inserted = 0
        skipped = 0

        for item in items:
            track = item.get("track", {})
            artists = track.get("artists", [{}])
            album = track.get("album", {})
            played_at = item.get("played_at", "")

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
                    spotify_context_uri=(
                        item.get("context", {}).get("uri") if item.get("context") else None
                    ),
                    track_name=track.get("name", "Unknown"),
                    artist_name=artists[0].get("name", "Unknown") if artists else "Unknown",
                    album_name=album.get("name", "Unknown"),
                    played_at_utc=played_at,
                    played_at_ts=played_at_ts,
                    duration_ms=track.get("duration_ms", 0),
                    explicit=track.get("explicit", False),
                    popularity=track.get("popularity", 0),
                    context_type=(
                        item.get("context", {}).get("type") if item.get("context") else None
                    ),
                )
                .on_conflict_do_nothing(index_elements=["user_id", "played_at_utc"])
            )
            result = await self.db.execute(stmt)
            if result.rowcount == 1:
                inserted += 1
            else:
                skipped += 1

        await self.db.flush()
        await self._audit(
            action="spotify_sync_plays",
            resource_type="spotify",
            metadata={"inserted": inserted, "skipped": skipped},
        )
        self._log.info("spotify_sync_plays", inserted=inserted, skipped=skipped)
        return {"inserted": inserted, "skipped": skipped}

    async def sync_top_snapshots(self) -> int:
        updated = 0
        for item_type in ("tracks", "artists"):
            for time_range in ("short_term", "medium_term", "long_term"):
                try:
                    items = await self.get_top_items(item_type, time_range, limit=50)
                    snapshot = SpotifyTopSnapshot(
                        user_id=self.user_id,
                        snapshot_type=item_type,
                        time_range=time_range,
                        items_json=json.dumps(items),
                        item_count=len(items),
                    )
                    self.db.add(snapshot)
                    updated += 1
                except SpotifyClientError:
                    self._log.warning(
                        "spotify_top_snapshot_failed",
                        item_type=item_type,
                        time_range=time_range,
                    )

        if updated:
            await self.db.flush()
        await self._audit(
            action="spotify_sync_snapshots",
            resource_type="spotify",
            metadata={"snapshots_updated": updated},
        )
        return updated

    async def sync(self) -> None:
        await self.sync_recently_played()
        await self.sync_top_snapshots()

    async def health_check(self) -> bool:
        try:
            await self._api_get("/me")
            return True
        except (SpotifyClientError, httpx.HTTPError):
            return False
