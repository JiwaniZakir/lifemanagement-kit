"""Spotify integration — listening history, top artists/tracks via Spotify Web API."""

from __future__ import annotations

import json
from datetime import datetime
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
        self._http: httpx.AsyncClient | None = None

    async def _get_http(self) -> httpx.AsyncClient:
        if self._http is None:
            self._http = httpx.AsyncClient(timeout=30.0)
        return self._http

    async def _ensure_access_token(self) -> str:
        if self._access_token is not None:
            return self._access_token

        client_id = await self.get_credential("spotify_client_id")
        client_secret = await self.get_credential("spotify_client_secret")
        refresh_token = await self.get_credential("spotify_refresh_token")

        http = await self._get_http()
        try:
            resp = await http.post(
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

            return self._access_token  # type: ignore[return-value]
        except httpx.HTTPStatusError as exc:
            raise SpotifyClientError("Failed to refresh Spotify access token") from exc

    async def _api_headers(self) -> dict[str, str]:
        token = await self._ensure_access_token()
        return {"Authorization": f"Bearer {token}"}

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPStatusError),
        reraise=True,
    )
    async def get_recently_played(self, limit: int = 50) -> list[dict[str, Any]]:
        http = await self._get_http()
        headers = await self._api_headers()
        resp = await http.get(
            f"{SPOTIFY_API_BASE}/me/player/recently-played",
            headers=headers,
            params={"limit": min(limit, 50)},
        )
        resp.raise_for_status()
        data = resp.json()
        await self._audit(action="spotify_recently_played_read", resource_type="spotify")
        return data.get("items", [])

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPStatusError),
        reraise=True,
    )
    async def get_top_items(
        self,
        item_type: str = "tracks",
        time_range: str = "medium_term",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        if item_type not in ("tracks", "artists"):
            msg = "item_type must be 'tracks' or 'artists'"
            raise ValueError(msg)
        if time_range not in ("short_term", "medium_term", "long_term"):
            msg = "time_range must be 'short_term', 'medium_term', or 'long_term'"
            raise ValueError(msg)

        http = await self._get_http()
        headers = await self._api_headers()
        resp = await http.get(
            f"{SPOTIFY_API_BASE}/me/top/{item_type}",
            headers=headers,
            params={"time_range": time_range, "limit": min(limit, 50)},
        )
        resp.raise_for_status()
        data = resp.json()
        await self._audit(
            action="spotify_top_items_read",
            resource_type="spotify",
            metadata={"item_type": item_type, "time_range": time_range},
        )
        return data.get("items", [])

    async def _upsert_plays(self, items: list[dict[str, Any]]) -> dict[str, int]:
        inserted = 0
        skipped = 0

        for item in items:
            track = item.get("track", {})
            artists = track.get("artists", [{}])
            album = track.get("album", {})
            played_at = item.get("played_at", "")

            try:
                played_at_dt = datetime.fromisoformat(played_at.replace("Z", "+00:00"))
                played_at_ts = int(played_at_dt.timestamp() * 1000)
            except (ValueError, AttributeError):
                continue

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
                .on_conflict_do_nothing(
                    index_elements=["user_id", "played_at_utc"],
                )
            )
            result = await self.db.execute(stmt)
            if result.rowcount == 1:
                inserted += 1
            else:
                skipped += 1

        if inserted:
            await self.db.flush()

        return {"inserted": inserted, "skipped": skipped}

    async def _save_top_snapshot(
        self, snapshot_type: str, time_range: str, items: list[dict[str, Any]]
    ) -> None:
        snapshot = SpotifyTopSnapshot(
            user_id=self.user_id,
            snapshot_type=snapshot_type,
            time_range=time_range,
            items_json=json.dumps(items),
            item_count=len(items),
        )
        self.db.add(snapshot)
        await self.db.flush()

    async def sync(self) -> None:
        items = await self.get_recently_played(limit=50)
        result = await self._upsert_plays(items)
        self._log.info(
            "spotify_sync_plays",
            inserted=result["inserted"],
            skipped=result["skipped"],
        )

        for time_range in ("short_term", "medium_term", "long_term"):
            for item_type in ("tracks", "artists"):
                try:
                    top_items = await self.get_top_items(
                        item_type=item_type,
                        time_range=time_range,
                        limit=20,
                    )
                    await self._save_top_snapshot(item_type, time_range, top_items)
                except (httpx.HTTPStatusError, SpotifyClientError):
                    self._log.warning(
                        "spotify_top_snapshot_failed",
                        item_type=item_type,
                        time_range=time_range,
                    )

        await self._audit(
            action="spotify_sync",
            resource_type="spotify",
            metadata={"plays": result},
        )

    async def health_check(self) -> bool:
        try:
            await self._ensure_access_token()
            return True
        except SpotifyClientError:
            return False

    async def close(self) -> None:
        if self._http is not None:
            await self._http.aclose()
            self._http = None
