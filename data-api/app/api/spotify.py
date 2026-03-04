"""Spotify API — listening history and top tracks/artists endpoints."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, desc, func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.integrations.spotify_client import SpotifyClient
from app.models.listening_history import ListeningHistory, SpotifyTopSnapshot
from app.security.audit import audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/spotify", tags=["spotify"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class ListeningHistoryCreate(BaseModel):
    user_id: str
    spotify_track_id: str
    spotify_artist_id: str
    spotify_album_id: str
    spotify_context_uri: str | None = None
    track_name: str
    artist_name: str
    album_name: str
    played_at_utc: str
    played_at_ts: int
    duration_ms: int = 0
    explicit: bool = False
    popularity: int = 0
    context_type: str | None = None
    energy: float | None = None
    valence: float | None = None
    tempo: float | None = None
    danceability: float | None = None


class ListeningHistoryBulkCreate(BaseModel):
    user_id: str
    plays: list[ListeningHistoryCreate] = Field(..., min_length=1, max_length=50)


class TopSnapshotCreate(BaseModel):
    user_id: str
    snapshot_type: str
    time_range: str
    items_json: str
    item_count: int


class ListeningHistoryResponse(BaseModel):
    id: str
    user_id: str
    spotify_track_id: str
    spotify_artist_id: str
    track_name: str
    artist_name: str
    album_name: str
    played_at_utc: str
    played_at_ts: int
    duration_ms: int
    explicit: bool
    popularity: int
    context_type: str | None
    energy: float | None
    valence: float | None
    tempo: float | None
    danceability: float | None
    created_at: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, obj: ListeningHistory) -> "ListeningHistoryResponse":
        return cls(
            id=str(obj.id),
            user_id=obj.user_id,
            spotify_track_id=obj.spotify_track_id,
            spotify_artist_id=obj.spotify_artist_id,
            track_name=obj.track_name,
            artist_name=obj.artist_name,
            album_name=obj.album_name,
            played_at_utc=obj.played_at_utc,
            played_at_ts=obj.played_at_ts,
            duration_ms=obj.duration_ms,
            explicit=obj.explicit,
            popularity=obj.popularity,
            context_type=obj.context_type,
            energy=obj.energy,
            valence=obj.valence,
            tempo=obj.tempo,
            danceability=obj.danceability,
            created_at=obj.created_at.isoformat(),
        )


class TopSnapshotResponse(BaseModel):
    id: str
    user_id: str
    snapshot_type: str
    time_range: str
    items_json: str
    item_count: int
    created_at: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, obj: SpotifyTopSnapshot) -> "TopSnapshotResponse":
        return cls(
            id=str(obj.id),
            user_id=obj.user_id,
            snapshot_type=obj.snapshot_type,
            time_range=obj.time_range,
            items_json=obj.items_json,
            item_count=obj.item_count,
            created_at=obj.created_at.isoformat(),
        )


class SyncResultResponse(BaseModel):
    synced_plays: int
    skipped_duplicates: int
    snapshots_updated: int
    errors: list[str]


class ListeningStatsResponse(BaseModel):
    user_id: str
    period_days: int
    total_plays: int
    total_minutes: float
    unique_tracks: int
    unique_artists: int
    top_track_name: str | None
    top_artist_name: str | None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/sync", response_model=SyncResultResponse)
async def sync_spotify_data(
    user_id: str = Query(..., description="User ID"),
    db: AsyncSession = Depends(get_db),
) -> SyncResultResponse:
    """
    Sync latest Spotify listening data for a user.
    Fetches recently played tracks and top artists/tracks.
    """
    try:
        async with SpotifyClient(user_id, db) as client:
            result = await client.sync()

        await audit_log(
            db,
            action="spotify_sync_requested",
            resource_type="spotify_data",
            resource_id=user_id,
            detail=f"Synced {result.get('synced_plays', 0)} plays, {result.get('snapshots_updated', 0)} snapshots",
        )

        return SyncResultResponse(**result)

    except Exception as e:
        logger.error(f"Spotify sync failed for user {user_id}: {str(e)}")
        await audit_log(
            db,
            action="spotify_sync_failed",
            resource_type="spotify_data",
            resource_id=user_id,
            detail=f"Sync failed: {str(e)}",
        )
        raise HTTPException(status_code=500, detail=f"Spotify sync failed: {str(e)}")


@router.get("/health")
async def check_spotify_health(
    user_id: str = Query(..., description="User ID"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    """Check Spotify API connection health for a user."""
    try:
        async with SpotifyClient(user_id, db) as client:
            is_healthy = await client.health_check()

        return {"healthy": is_healthy}

    except Exception as e:
        logger.error(f"Spotify health check failed for user {user_id}: {str(e)}")
        return {"healthy": False}


@router.post("/plays/bulk", status_code=201, response_model=dict[str, int])
async def bulk_upsert_plays(
    body: ListeningHistoryBulkCreate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """
    Upsert a batch of recently played tracks (max 50, matching Spotify's page size).
    Uses ON CONFLICT DO NOTHING on (user_id, played_at_utc) — safe to call repeatedly.
    Returns {"inserted": N, "skipped": M}.
    """
    inserted = 0
    skipped = 0

    for play in body.plays:
        stmt = (
            pg_insert(ListeningHistory)
            .values(
                user_id=play.user_id,
                spotify_track_id=play.spotify_track_id,
                spotify_artist_id=play.spotify_artist_id,
                spotify_album_id=play.spotify_album_id,
                spotify_context_uri=play.spotify_context_uri,
                track_name=play.track_name,
                artist_name=play.artist_name,
                album_name=play.album_name,
                played_at_utc=play.played_at_utc,
                played_at_ts=play.played_at_ts,
                duration_ms=play.duration_ms,
                explicit=play.explicit,
                popularity=play.popularity,
                context_type=play.context_type,
                energy=play.energy,
                valence=play.valence,
                tempo=play.tempo,
                danceability=play.danceability,
            )
            .on_conflict_do_nothing(
                index_elements=["user_id", "played_at_utc"]
            )
        )
        result = await db.execute(stmt)
        if result.rowcount == 1:
            inserted += 1
        else:
            skipped += 1

    await db.commit()
    logger.info("spotify_bulk_upsert", extra={"inserted": inserted, "skipped": skipped})
    return {"inserted": inserted, "skipped": skipped}


@router.get("/plays/recent", response_model=list[ListeningHistoryResponse])
async def get_recent_plays(
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(50, ge=1, le=200, description="Number of plays to return"),
    db: AsyncSession = Depends(get_db),
) -> list[ListeningHistoryResponse]:
    """
    Return the most recent play events for a user, newest first.
    Used by the agent to answer 'what have I been listening to lately?'
    """
    result = await db.execute(
        select(ListeningHistory)
        .where(ListeningHistory.user_id == user_id)
        .order_by(desc(ListeningHistory.played_at_ts))
        .limit(limit)
    )
    rows = result.scalars().all()
    return [ListeningHistoryResponse.from_orm(r) for r in rows]


@router.get("/plays/range", response_model=list[ListeningHistoryResponse])
async def get_plays_in_range(
    user_id: str = Query(..., description="Start of range, Unix milliseconds"),
    after_ts: int = Query(..., description="Start of range, Unix milliseconds"),
    before_ts: int = Query(..., description="End of range, Unix milliseconds"),
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
) -> list[ListeningHistoryResponse]:
    """
    Return plays within a Unix-ms timestamp range.
    Useful for daily/weekly recaps, e.g. 'what did I listen to yesterday?'
    """
    result = await db.execute(
        select(ListeningHistory)
        .where(
            ListeningHistory.user_id == user_id,
            ListeningHistory.played_at_ts >= after_ts,
            ListeningHistory.played_at_ts <= before_ts,
        )
        .order_by(desc(ListeningHistory.played_at_ts))
        .limit(limit)
    )
    rows = result.scalars().all()
    return [ListeningHistoryResponse.from_orm(r) for r in rows]


@router.get("/plays/stats", response_model=ListeningStatsResponse)
async def get_listening_stats(
    user_id: str = Query(..., description="User ID"),
    period_days: int = Query(7, ge=1, le=365, description="Look-back window in days"),
    db: AsyncSession = Depends(get_db),
) -> ListeningStatsResponse:
    """
    Return aggregate listening statistics for the last N days.
    Includes total plays, total listening minutes, unique tracks/artists, and top track/artist.
    """
    cutoff_ts = int((time.time() - period_days * 86400) * 1000)

    # Aggregate counts
    agg_result = await db.execute(
        select(
            func.count(ListeningHistory.id).label("total_plays"),
            func.coalesce(func.sum(ListeningHistory.duration_ms), 0).label("total_ms"),
            func.count(func.distinct(ListeningHistory.spotify_track_id)).label("unique_tracks"),
            func.count(func.distinct(ListeningHistory.spotify_artist_id)).label("unique_artists"),
        ).where(
            ListeningHistory.user_id == user_id,
            ListeningHistory.played_at_ts >= cutoff_ts,
        )
    )
    agg = agg_result.one()

    # Top track by play count
    top_track_result = await db.execute(
        select(ListeningHistory.track_name, func.count().label("cnt"))
        .where(
            ListeningHistory.user_id == user_id,
            ListeningHistory.played_at_ts >= cutoff_ts,
        )
        .group_by(ListeningHistory.track_name)
        .order_by(desc("cnt"))
        .limit(1)
    )
    top_track_row = top_track_result.first()

    # Top artist by play count
    top_artist_result = await db.execute(
        select(ListeningHistory.artist_name, func.count().label("cnt"))
        .where(
            ListeningHistory.user_id == user_id,
            ListeningHistory.played_at_ts >= cutoff_ts,
        )
        .group_by(ListeningHistory.artist_name)
        .order_by(desc("cnt"))
        .limit(1)
    )
    top_artist_row = top_artist_result.first()

    return ListeningStatsResponse(
        user_id=user_id,
        period_days=period_days,
        total_plays=agg.total_plays,
        total_minutes=round(agg.total_ms / 60000, 1),  # Convert ms to minutes
        unique_tracks=agg.unique_tracks,
        unique_artists=agg.unique_artists,
        top_track_name=top_track_row.track_name if top_track_row else None,
        top_artist_name=top_artist_row.artist_name if top_artist_row else None,
    )


@router.get("/top/{snapshot_type}", response_model=TopSnapshotResponse | None)
async def get_top_snapshot(
    snapshot_type: str,
    user_id: str = Query(..., description="User ID"),
    time_range: str = Query("short_term", description="Time range: short_term, medium_term, long_term"),
    db: AsyncSession = Depends(get_db),
) -> TopSnapshotResponse | None:
    """
    Get a user's top artists or tracks snapshot for a given time range.
    Returns None if no snapshot exists.
    """
    if snapshot_type not in ["artists", "tracks"]:
        raise HTTPException(status_code=400, detail="snapshot_type must be 'artists' or 'tracks'")

    if time_range not in ["short_term", "medium_term", "long_term"]:
        raise HTTPException(status_code=400, detail="time_range must be 'short_term', 'medium_term', or 'long_term'")

    result = await db.execute(
        select(SpotifyTopSnapshot)
        .where(
            SpotifyTopSnapshot.user_id == user_id,
            SpotifyTopSnapshot.snapshot_type == snapshot_type,
            SpotifyTopSnapshot.time_range == time_range,
        )
        .order_by(desc(SpotifyTopSnapshot.created_at))
        .limit(1)
    )
    snapshot = result.scalar_one_or_none()

    if snapshot:
        return TopSnapshotResponse.from_orm(snapshot)
    return None


@router.delete("/plays", response_model=dict[str, int])
async def delete_listening_history(
    user_id: str = Query(..., description="User ID"),
    before_ts: int | None = Query(None, description="Delete plays before this timestamp (Unix ms)"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """
    Delete listening history for a user. If before_ts is provided, only delete plays before that timestamp.
    Otherwise, delete all listening history for the user.
    """
    if before_ts:
        stmt = delete(ListeningHistory).where(
            ListeningHistory.user_id == user_id,
            ListeningHistory.played_at_ts < before_ts,
        )
    else:
        stmt = delete(ListeningHistory).where(ListeningHistory.user_id == user_id)

    result = await db.execute(stmt)
    deleted_count = result.rowcount or 0

    await db.commit()
    await audit_log(
        db,
        action="spotify_history_deleted",
        resource_type="listening_history",
        resource_id=user_id,
        detail=f"Deleted {deleted_count} listening history entries",
        metadata={"deleted_count": deleted_count, "before_ts": before_ts},
    )

    return {"deleted": deleted_count}