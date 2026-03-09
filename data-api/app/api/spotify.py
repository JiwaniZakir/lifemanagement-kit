"""Spotify API — listening history, top snapshots, and stats."""

from __future__ import annotations

import time

import structlog
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.listening_history import ListeningHistory, SpotifyTopSnapshot
from app.security.audit import audit_log

logger = structlog.get_logger()

router = APIRouter(tags=["spotify"])


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
    snapshot_type: str = Field(..., pattern=r"^(artists|tracks)$")
    time_range: str = Field(..., pattern=r"^(short_term|medium_term|long_term)$")
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


class TopSnapshotResponse(BaseModel):
    id: str
    user_id: str
    snapshot_type: str
    time_range: str
    items_json: str
    item_count: int
    created_at: str

    model_config = {"from_attributes": True}


class ListeningStatsResponse(BaseModel):
    user_id: str
    period_days: int
    total_plays: int
    total_minutes: float
    unique_tracks: int
    unique_artists: int
    top_track_name: str | None
    top_artist_name: str | None


@router.post("/plays/bulk", status_code=201)
async def bulk_upsert_plays(
    body: ListeningHistoryBulkCreate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
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
            .on_conflict_do_nothing(index_elements=["user_id", "played_at_utc"])
        )
        result = await db.execute(stmt)
        if result.rowcount == 1:
            inserted += 1
        else:
            skipped += 1

    await audit_log(
        db,
        action="spotify_bulk_upsert",
        resource_type="spotify",
        metadata={"inserted": inserted, "skipped": skipped},
    )
    logger.info("spotify_bulk_upsert", inserted=inserted, skipped=skipped)
    return {"inserted": inserted, "skipped": skipped}


@router.get("/plays/recent", response_model=list[ListeningHistoryResponse])
async def get_recent_plays(
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[ListeningHistoryResponse]:
    result = await db.execute(
        select(ListeningHistory)
        .where(ListeningHistory.user_id == user_id)
        .order_by(desc(ListeningHistory.played_at_ts))
        .limit(limit)
    )
    rows = result.scalars().all()
    return [ListeningHistoryResponse.model_validate(r) for r in rows]


@router.get("/plays/range", response_model=list[ListeningHistoryResponse])
async def get_plays_in_range(
    user_id: str = Query(..., description="User ID"),
    after_ts: int = Query(..., description="Start of range, Unix milliseconds"),
    before_ts: int = Query(..., description="End of range, Unix milliseconds"),
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
) -> list[ListeningHistoryResponse]:
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
    return [ListeningHistoryResponse.model_validate(r) for r in rows]


@router.get("/plays/stats", response_model=ListeningStatsResponse)
async def get_listening_stats(
    user_id: str = Query(..., description="User ID"),
    period_days: int = Query(7, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
) -> ListeningStatsResponse:
    cutoff_ts = int((time.time() - period_days * 86400) * 1000)

    agg_result = await db.execute(
        select(
            func.count(ListeningHistory.id).label("total_plays"),
            func.coalesce(func.sum(ListeningHistory.duration_ms), 0).label("total_ms"),
            func.count(func.distinct(ListeningHistory.spotify_track_id)).label("unique_tracks"),
            func.count(func.distinct(ListeningHistory.spotify_artist_id)).label(
                "unique_artists"
            ),
        ).where(
            ListeningHistory.user_id == user_id,
            ListeningHistory.played_at_ts >= cutoff_ts,
        )
    )
    agg = agg_result.one()

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
        total_minutes=round(agg.total_ms / 60000, 1),
        unique_tracks=agg.unique_tracks,
        unique_artists=agg.unique_artists,
        top_track_name=top_track_row.track_name if top_track_row else None,
        top_artist_name=top_artist_row.artist_name if top_artist_row else None,
    )


@router.post("/top/snapshot", status_code=201)
async def upsert_top_snapshot(
    body: TopSnapshotCreate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    stmt = (
        pg_insert(SpotifyTopSnapshot)
        .values(
            user_id=body.user_id,
            snapshot_type=body.snapshot_type,
            time_range=body.time_range,
            items_json=body.items_json,
            item_count=body.item_count,
        )
        .on_conflict_do_nothing()
    )
    await db.execute(stmt)

    await audit_log(
        db,
        action="spotify_top_snapshot",
        resource_type="spotify",
        metadata={
            "snapshot_type": body.snapshot_type,
            "time_range": body.time_range,
            "item_count": body.item_count,
        },
    )
    return {"status": "ok"}


@router.get("/top/latest", response_model=list[TopSnapshotResponse])
async def get_latest_top_snapshots(
    user_id: str = Query(..., description="User ID"),
    snapshot_type: str = Query("artists", pattern=r"^(artists|tracks)$"),
    db: AsyncSession = Depends(get_db),
) -> list[TopSnapshotResponse]:
    result = await db.execute(
        select(SpotifyTopSnapshot)
        .where(
            SpotifyTopSnapshot.user_id == user_id,
            SpotifyTopSnapshot.snapshot_type == snapshot_type,
        )
        .order_by(desc(SpotifyTopSnapshot.created_at))
        .limit(3)
    )
    rows = result.scalars().all()
    return [TopSnapshotResponse.model_validate(r) for r in rows]


@router.post("/sync")
async def sync_spotify(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        from app.integrations.spotify_client import SpotifyClient

        client = SpotifyClient(user_id, db)
        await client.sync()
        await audit_log(db, action="spotify_sync", resource_type="spotify")
        return {"ok": True}
    except ImportError:
        logger.error("spotify_sync_import_error")
        return {"ok": False, "error": "httpx not available"}
    except Exception as exc:
        logger.error("spotify_sync_error", error=type(exc).__name__)
        return {"ok": False, "error": type(exc).__name__}
