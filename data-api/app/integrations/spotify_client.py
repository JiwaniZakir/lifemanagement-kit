"""Spotify Web API integration client."""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Any

import httpx
import structlog
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.base import BaseIntegration
from app.models.listening_history import ListeningHistory, SpotifyTopSnapshot

logger = structlog.get_logger()


class SpotifyTrack(BaseModel):
    """Spotify track from recently-played response."""

    id: str
    name: str
    duration_ms: int
    explicit: bool
    popularity: int
    artists: list[dict[str, Any]]
    album: dict[str, Any]


class SpotifyPlayEvent(BaseModel):
    """Spotify play event from recently-played response."""

    track: SpotifyTrack
    played_at: str  # ISO-8601 string
    context: dict[str, Any] | None


class SpotifyClient(BaseIntegration):
    """Spotify Web API client following BaseIntegration pattern.

    Uses OAuth 2.0 Authorization Code Flow with PKCE. Requires initial
    out-of-band OAuth dance to obtain refresh token.
    """

    BASE_URL = "https://api.spotify.com/v1"

    def __init__(self, user_id: str, db: AsyncSession) -> None:
        super().__init__(user_id, db)
        self._http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            headers={"User-Agent": "Aegis/1.0"},
        )

    async def health_check(self) -> bool:
        """Verify Spotify API connection and token validity."""
        try:
            access_token = await self._get_access_token()
            async with self._http_client as client:
                response = await client.get(
                    f"{self.BASE_URL}/me",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if response.status_code == 200:
                    self._log.info("spotify_health_check_success")
                    return True
                else:
                    self._log.warning(
                        "spotify_health_check_failed",
                        status_code=response.status_code,
                        response=response.text,
                    )
                    return False
        except Exception as e:
            self._log.error("spotify_health_check_error", error=str(e))
            return False

    async def sync(self) -> dict[str, Any]:
        """Sync recently played tracks and top artists/tracks."""
        try:
            access_token = await self._get_access_token()

            # Sync recently played tracks
            plays_result = await self._sync_recently_played(access_token)

            # Sync top snapshots (artists and tracks for different time ranges)
            snapshots_result = await self._sync_top_snapshots(access_token)

            result = {
                "synced_plays": plays_result.get("inserted", 0),
                "skipped_duplicates": plays_result.get("skipped", 0),
                "snapshots_updated": snapshots_result.get("updated", 0),
                "errors": [],
            }

            await self._audit(
                action="spotify_sync_completed",
                resource_type="spotify_data",
                detail=f"Synced {result['synced_plays']} new plays, updated {result['snapshots_updated']} snapshots",
                metadata=result,
            )

            return result

        except Exception as e:
            error_msg = str(e)
            self._log.error("spotify_sync_failed", error=error_msg)
            await self._audit(
                action="spotify_sync_failed",
                resource_type="spotify_data",
                detail=f"Sync failed: {error_msg}",
            )
            return {
                "synced_plays": 0,
                "skipped_duplicates": 0,
                "snapshots_updated": 0,
                "errors": [error_msg],
            }

    async def _get_access_token(self) -> str:
        """Get valid access token, refreshing if necessary."""
        try:
            # Try to get existing access token
            access_token = await self.get_credential("spotify_access_token")

            # Check if token is still valid by making a lightweight API call
            async with self._http_client as client:
                response = await client.get(
                    f"{self.BASE_URL}/me",
                    headers={"Authorization": f"Bearer {access_token}"},
                )

                if response.status_code == 200:
                    return access_token
                elif response.status_code == 401:
                    # Token expired, refresh it
                    return await self._refresh_access_token()
                else:
                    raise RuntimeError(f"Spotify API error: {response.status_code}")

        except Exception:
            # No access token or refresh needed
            return await self._refresh_access_token()

    async def _refresh_access_token(self) -> str:
        """Refresh access token using stored refresh token."""
        refresh_token = await self.get_credential("spotify_refresh_token")
        client_id = await self.get_credential("spotify_client_id")
        client_secret = await self.get_credential("spotify_client_secret")

        async with self._http_client as client:
            response = await client.post(
                "https://accounts.spotify.com/api/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            if response.status_code != 200:
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
                raise RuntimeError(f"Token refresh failed: {error_data}")

            token_data = response.json()
            new_access_token = token_data["access_token"]

            # Store new access token
            await self.store_credential("spotify_access_token", new_access_token)

            # Update refresh token if provided
            if "refresh_token" in token_data:
                await self.store_credential("spotify_refresh_token", token_data["refresh_token"])

            await self._audit(
                action="spotify_token_refreshed",
                resource_type="credential",
                detail="Successfully refreshed Spotify access token",
            )

            return new_access_token

    async def _sync_recently_played(self, access_token: str) -> dict[str, int]:
        """Sync recently played tracks from Spotify."""
        async with self._http_client as client:
            # Get last sync timestamp to avoid duplicates
            last_sync_result = await self.db.execute(
                select(ListeningHistory.played_at_ts)
                .where(ListeningHistory.user_id == self.user_id)
                .order_by(ListeningHistory.played_at_ts.desc())
                .limit(1)
            )
            last_sync_row = last_sync_result.first()
            after_ts = last_sync_row[0] if last_sync_row else 0

            # Spotify API requires Unix timestamp in milliseconds
            params = {"limit": 50}
            if after_ts > 0:
                params["after"] = after_ts

            response = await client.get(
                f"{self.BASE_URL}/me/player/recently-played",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )

            if response.status_code != 200:
                raise RuntimeError(f"Recently played API error: {response.status_code} {response.text}")

            data = response.json()
            items = data.get("items", [])

            inserted = 0
            skipped = 0

            for item in items:
                try:
                    play_event = SpotifyPlayEvent(**item)

                    # Convert ISO-8601 to Unix milliseconds
                    played_at_dt = datetime.fromisoformat(play_event.played_at.replace("Z", "+00:00"))
                    played_at_ts = int(played_at_dt.timestamp() * 1000)

                    # Extract context information
                    context_type = None
                    context_uri = None
                    if play_event.context:
                        context_uri = play_event.context.get("uri")
                        if context_uri:
                            context_type = context_uri.split(":")[1]  # Extract type from "spotify:playlist:..."

                    # Get primary artist (first in list)
                    primary_artist = play_event.track.artists[0] if play_event.track.artists else {"id": "unknown", "name": "Unknown Artist"}

                    # Insert or ignore (dedup by user_id + played_at_utc)
                    stmt = (
                        pg_insert(ListeningHistory)
                        .values(
                            user_id=self.user_id,
                            spotify_track_id=play_event.track.id,
                            spotify_artist_id=primary_artist["id"],
                            spotify_album_id=play_event.track.album["id"],
                            spotify_context_uri=context_uri,
                            track_name=play_event.track.name,
                            artist_name=primary_artist["name"],
                            album_name=play_event.track.album["name"],
                            played_at_utc=play_event.played_at,
                            played_at_ts=played_at_ts,
                            duration_ms=play_event.track.duration_ms,
                            explicit=play_event.track.explicit,
                            popularity=play_event.track.popularity,
                            context_type=context_type,
                        )
                        .on_conflict_do_nothing(
                            index_elements=["user_id", "played_at_utc"]
                        )
                    )

                    result = await self.db.execute(stmt)
                    if result.rowcount == 1:
                        inserted += 1
                    else:
                        skipped += 1

                except Exception as e:
                    self._log.warning("spotify_play_event_parse_error", error=str(e), item=item)
                    skipped += 1

            await self.db.commit()
            self._log.info("spotify_recently_played_sync", inserted=inserted, skipped=skipped)

            return {"inserted": inserted, "skipped": skipped}

    async def _sync_top_snapshots(self, access_token: str) -> dict[str, int]:
        """Sync top artists and tracks snapshots."""
        updated = 0

        time_ranges = ["short_term", "medium_term", "long_term"]
        snapshot_types = [("artists", "artists"), ("tracks", "tracks")]

        async with self._http_client as client:
            for time_range in time_ranges:
                for snapshot_type, endpoint in snapshot_types:
                    try:
                        response = await client.get(
                            f"{self.BASE_URL}/me/top/{endpoint}",
                            headers={"Authorization": f"Bearer {access_token}"},
                            params={"time_range": time_range, "limit": 50},
                        )

                        if response.status_code != 200:
                            self._log.warning(
                                "spotify_top_api_error",
                                snapshot_type=snapshot_type,
                                time_range=time_range,
                                status_code=response.status_code,
                            )
                            continue

                        data = response.json()
                        items = data.get("items", [])

                        # Store as JSON snapshot, replacing any existing snapshot
                        await self.db.execute(
                            pg_insert(SpotifyTopSnapshot)
                            .values(
                                user_id=self.user_id,
                                snapshot_type=snapshot_type,
                                time_range=time_range,
                                items_json=json.dumps(items),
                                item_count=len(items),
                            )
                            .on_conflict_do_update(
                                index_elements=["user_id", "snapshot_type", "time_range"],
                                set_={
                                    "items_json": json.dumps(items),
                                    "item_count": len(items),
                                    "updated_at": datetime.now(timezone.utc),
                                },
                            )
                        )
                        updated += 1

                    except Exception as e:
                        self._log.warning(
                            "spotify_top_snapshot_error",
                            snapshot_type=snapshot_type,
                            time_range=time_range,
                            error=str(e),
                        )

            await self.db.commit()
            self._log.info("spotify_top_snapshots_sync", updated=updated)

            return {"updated": updated}

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._http_client.aclose()