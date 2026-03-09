"""Spotify integration — listening history, top artists/tracks via Spotify Web API."""

from __future__ import annotations

import json
import time
from typing import Any

import httpx
import structlog
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

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

        self._access_token = data["access_token"]

        if new_refresh := data.get("refresh_token"):
            await self.store_credential("spotify_refresh_token", new_refresh)

        self._log.debug("spotify_token_refreshed")
        return self._access_token

    async def _ensure_token(self) -> str:
        if self._access_token is None:
            return await self._refresh_access_token()
        return self._access_token

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

    async def get_top(
        self, item_type: str = "artists", time_range: str = "medium_term", limit: int = 20
    ) -> list[dict]:
        data = await self._api_get(
            f"/me/top/{item_type}",
            {"time_range": time_range, "limit": limit},
        )
        return data.get("items", [])

    async def _sync_recently_played(self) -> tuple[int, int]:
        items = await self.get_recently_played(limit=50)
        inserted = 0
        skipped = 0

        for item in items:
            track = item.get("track", {})
            artists = track.get("artists", [])
            album = track.get("album", {})
            played_at = item.get("played_at", "")
            played_at_ts = int(
                time.mktime(time.strptime(played_at[:19], "%Y-%m-%dT%H:%M:%S")) * 1000
            ) if played_at else 0

            stmt = (
                pg_insert(ListeningHistory)
                .values(
                    user_id=self.user_id,
                    spotify_track_id=track.get("id", ""),
                    spotify_artist_id=artists[0]["id"] if artists else "",
                    spotify_album_id=album.get("id", ""),
                    spotify_context_uri=item.get("context", {}).get("uri") if item.get("context") else None,
                    track_name=track.get("name", ""),
                    artist_name=artists[0]["name"] if artists else "Unknown",
                    album_name=album.get("name", ""),
                    played_at_utc=played_at,
                    played_at_ts=played_at_ts,
                    duration_ms=track.get("duration_ms", 0),
                    explicit=track.get("explicit", False),
                    popularity=track.get("popularity", 0),
                    context_type=item.get("context", {}).get("type") if item.get("context") else None,
                )
                .on_conflict_do_nothing(index_elements=["user_id", "played_at_utc"])
            )
            result = await self.db.execute(stmt)
            if result.rowcount == 1:
                inserted += 1
            else:
                skipped += 1

        if inserted:
            await self.db.flush()
        return inserted, skipped

    async def _sync_top_snapshots(self) -> int:
        updated = 0
        for item_type in ("artists", "tracks"):
            for time_range in ("short_term", "medium_term", "long_term"):
                try:
                    items = await self.get_top(item_type, time_range, limit=20)
                    stmt = (
                        pg_insert(SpotifyTopSnapshot)
                        .values(
                            user_id=self.user_id,
                            snapshot_type=item_type,
                            time_range=time_range,
                            items_json=json.dumps(items),
                            item_count=len(items),
                        )
                        .on_conflict_do_nothing()
                    )
                    await self.db.execute(stmt)
                    updated += 1
                except httpx.HTTPStatusError as exc:
                    self._log.warning(
                        "spotify_top_fetch_failed",
                        item_type=item_type,
                        time_range=time_range,
                        status=exc.response.status_code,
                    )
        if updated:
            await self.db.flush()
        return updated

    async def sync(self) -> None:
        inserted, skipped = await self._sync_recently_played()
        snapshots = await self._sync_top_snapshots()

        await self._audit(
            action="spotify_sync",
            resource_type="spotify",
            metadata={
                "inserted": inserted,
                "skipped": skipped,
                "snapshots_updated": snapshots,
            },
        )
        self._log.info(
            "spotify_sync_complete",
            inserted=inserted,
            skipped=skipped,
            snapshots=snapshots,
        )

    async def health_check(self) -> bool:
        try:
            await self._api_get("/me")
            return True
        except (httpx.HTTPError, SpotifyClientError):
            return False
