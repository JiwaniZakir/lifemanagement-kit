"""Spotify integration — listening history via Spotify Web API."""

from __future__ import annotations

import json
import time
from typing import Any

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.integrations.base import BaseIntegration
from app.models.listening_history import ListeningHistory, SpotifyTopSnapshot

logger = structlog.get_logger()

_SPOTIFY_API_BASE = "https://api.spotify.com/v1"
_SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"  # noqa: S105


class SpotifyError(RuntimeError):
    pass


class SpotifyClient(BaseIntegration):
    """Read-only Spotify integration via OAuth 2.0 Authorization Code Flow."""

    def __init__(self, user_id: str, db: AsyncSession) -> None:
        super().__init__(user_id, db)

    async def _get_access_token(self) -> str:
        try:
            return await self.get_credential("spotify_access_token")
        except (KeyError, ValueError):
            return await self._refresh_access_token()

    async def _refresh_access_token(self) -> str:
        refresh_token = await self.get_credential("spotify_refresh_token")
        client_id = await self.get_credential("spotify_client_id")
        client_secret = await self.get_credential("spotify_client_secret")

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                _SPOTIFY_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
            )
            response.raise_for_status()
            data = response.json()

        new_access = data["access_token"]
        await self.store_credential("spotify_access_token", new_access)

        if "refresh_token" in data:
            await self.store_credential("spotify_refresh_token", data["refresh_token"])

        self._log.info("spotify_token_refreshed")
        return new_access

    async def _api_request(
        self, path: str, *, params: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        access_token = await self._get_access_token()
        url = f"{_SPOTIFY_API_BASE}{path}"
        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 401:
                access_token = await self._refresh_access_token()
                headers["Authorization"] = f"Bearer {access_token}"
                response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        reraise=True,
    )
    async def get_recently_played(self, limit: int = 50) -> list[dict[str, Any]]:
        data = await self._api_request(
            "/me/player/recently-played",
            params={"limit": min(limit, 50)},
        )
        return data.get("items", [])

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        reraise=True,
    )
    async def get_top_items(
        self, item_type: str = "tracks", time_range: str = "medium_term", limit: int = 50
    ) -> list[dict[str, Any]]:
        data = await self._api_request(
            f"/me/top/{item_type}",
            params={"time_range": time_range, "limit": min(limit, 50)},
        )
        return data.get("items", [])

    async def _sync_recently_played(self) -> dict[str, int]:
        items = await self.get_recently_played(limit=50)
        inserted = 0
        skipped = 0

        for item in items:
            track = item.get("track", {})
            played_at = item.get("played_at", "")
            artists = track.get("artists", [])
            album = track.get("album", {})
            context = item.get("context")

            played_at_ts = int(
                time.mktime(time.strptime(played_at[:19], "%Y-%m-%dT%H:%M:%S")) * 1000
            ) if played_at else 0

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

        await self.db.commit()
        self._log.info("spotify_plays_synced", inserted=inserted, skipped=skipped)
        return {"inserted": inserted, "skipped": skipped}

    async def _sync_top_snapshots(self) -> int:
        updated = 0
        for snapshot_type in ("tracks", "artists"):
            for time_range in ("short_term", "medium_term", "long_term"):
                try:
                    items = await self.get_top_items(
                        item_type=snapshot_type, time_range=time_range, limit=50
                    )
                    items_json = json.dumps(items)

                    existing = await self.db.execute(
                        select(SpotifyTopSnapshot).where(
                            SpotifyTopSnapshot.user_id == self.user_id,
                            SpotifyTopSnapshot.snapshot_type == snapshot_type,
                            SpotifyTopSnapshot.time_range == time_range,
                        )
                    )
                    row = existing.scalars().first()

                    if row:
                        row.items_json = items_json
                        row.item_count = len(items)
                    else:
                        self.db.add(
                            SpotifyTopSnapshot(
                                user_id=self.user_id,
                                snapshot_type=snapshot_type,
                                time_range=time_range,
                                items_json=items_json,
                                item_count=len(items),
                            )
                        )
                    updated += 1
                except httpx.HTTPStatusError as exc:
                    self._log.warning(
                        "spotify_top_fetch_failed",
                        snapshot_type=snapshot_type,
                        time_range=time_range,
                        status=exc.response.status_code,
                    )

        await self.db.commit()
        self._log.info("spotify_snapshots_synced", updated=updated)
        return updated

    async def sync(self) -> None:
        play_result = await self._sync_recently_played()
        snapshots_updated = await self._sync_top_snapshots()
        await self._audit(
            action="spotify_sync",
            resource_type="spotify",
            metadata={
                "inserted": play_result["inserted"],
                "skipped": play_result["skipped"],
                "snapshots_updated": snapshots_updated,
            },
        )

    async def health_check(self) -> bool:
        try:
            await self._api_request("/me")
            return True
        except Exception:
            return False
