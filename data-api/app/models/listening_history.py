"""Spotify listening history and top snapshots models."""

from __future__ import annotations

from sqlalchemy import BigInteger, Boolean, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class ListeningHistory(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "listening_history"

    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)

    spotify_track_id: Mapped[str] = mapped_column(String(64), nullable=False)
    spotify_artist_id: Mapped[str] = mapped_column(String(64), nullable=False)
    spotify_album_id: Mapped[str] = mapped_column(String(64), nullable=False)
    spotify_context_uri: Mapped[str | None] = mapped_column(String(255), nullable=True)

    track_name: Mapped[str] = mapped_column(String(512), nullable=False)
    artist_name: Mapped[str] = mapped_column(String(512), nullable=False)
    album_name: Mapped[str] = mapped_column(String(512), nullable=False)

    played_at_utc: Mapped[str] = mapped_column(String(32), nullable=False)
    played_at_ts: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    explicit: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    popularity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    context_type: Mapped[str | None] = mapped_column(String(32), nullable=True)

    energy: Mapped[float | None] = mapped_column(Float, nullable=True)
    valence: Mapped[float | None] = mapped_column(Float, nullable=True)
    tempo: Mapped[float | None] = mapped_column(Float, nullable=True)
    danceability: Mapped[float | None] = mapped_column(Float, nullable=True)

    __table_args__ = (
        Index(
            "uq_listening_history_user_played_at",
            "user_id",
            "played_at_utc",
            unique=True,
        ),
        Index("ix_listening_history_user_ts", "user_id", "played_at_ts"),
    )


class SpotifyTopSnapshot(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "spotify_top_snapshot"

    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    snapshot_type: Mapped[str] = mapped_column(String(16), nullable=False)
    time_range: Mapped[str] = mapped_column(String(16), nullable=False)
    items_json: Mapped[str] = mapped_column(Text, nullable=False)
    item_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        Index("ix_spotify_top_user_type_range", "user_id", "snapshot_type", "time_range"),
    )
