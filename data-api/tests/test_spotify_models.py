"""Tests for the Spotify database models."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest

from app.models.listening_history import ListeningHistory, SpotifyTopSnapshot


class TestListeningHistoryModel:
    """Test suite for ListeningHistory model."""

    def test_listening_history_creation(self):
        """Test creating a ListeningHistory instance."""
        listening = ListeningHistory(
            user_id="test_user",
            spotify_track_id="4iV5W9uYEdYUVa79Axb7Rh",
            spotify_artist_id="0TnOYISbd1XYRBk9myaseg",
            spotify_album_id="37i9dQZF1DX0XUsuxWHRQd",
            track_name="Watermelon Sugar",
            artist_name="Harry Styles",
            album_name="Fine Line",
            played_at_utc="2026-03-04T14:23:00.000Z",
            played_at_ts=1709556180000,
            duration_ms=174000,
            explicit=False,
            popularity=85,
        )

        assert listening.user_id == "test_user"
        assert listening.track_name == "Watermelon Sugar"
        assert listening.artist_name == "Harry Styles"
        assert listening.duration_ms == 174000
        assert listening.explicit is False
        assert listening.popularity == 85

    def test_listening_history_with_optional_fields(self):
        """Test creating a ListeningHistory with optional audio features."""
        listening = ListeningHistory(
            user_id="test_user",
            spotify_track_id="4iV5W9uYEdYUVa79Axb7Rh",
            spotify_artist_id="0TnOYISbd1XYRBk9myaseg",
            spotify_album_id="37i9dQZF1DX0XUsuxWHRQd",
            track_name="Watermelon Sugar",
            artist_name="Harry Styles",
            album_name="Fine Line",
            played_at_utc="2026-03-04T14:23:00.000Z",
            played_at_ts=1709556180000,
            duration_ms=174000,
            explicit=False,
            popularity=85,
            context_type="playlist",
            energy=0.816,
            valence=0.557,
            tempo=95.0,
            danceability=0.548,
        )

        assert listening.context_type == "playlist"
        assert listening.energy == 0.816
        assert listening.valence == 0.557
        assert listening.tempo == 95.0
        assert listening.danceability == 0.548

    def test_listening_history_defaults(self):
        """Test ListeningHistory default values."""
        listening = ListeningHistory(
            user_id="test_user",
            spotify_track_id="4iV5W9uYEdYUVa79Axb7Rh",
            spotify_artist_id="0TnOYISbd1XYRBk9myaseg",
            spotify_album_id="37i9dQZF1DX0XUsuxWHRQd",
            track_name="Watermelon Sugar",
            artist_name="Harry Styles",
            album_name="Fine Line",
            played_at_utc="2026-03-04T14:23:00.000Z",
            played_at_ts=1709556180000,
        )

        assert listening.duration_ms == 0  # Default value
        assert listening.explicit is False  # Default value
        assert listening.popularity == 0  # Default value
        assert listening.context_type is None  # Optional field
        assert listening.energy is None  # Optional field


class TestSpotifyTopSnapshotModel:
    """Test suite for SpotifyTopSnapshot model."""

    def test_spotify_top_snapshot_creation(self):
        """Test creating a SpotifyTopSnapshot instance."""
        snapshot = SpotifyTopSnapshot(
            user_id="test_user",
            snapshot_type="artists",
            time_range="short_term",
            items_json='[{"id":"0TnOYISbd1XYRBk9myaseg","name":"Harry Styles"}]',
            item_count=1,
        )

        assert snapshot.user_id == "test_user"
        assert snapshot.snapshot_type == "artists"
        assert snapshot.time_range == "short_term"
        assert snapshot.item_count == 1
        assert "Harry Styles" in snapshot.items_json

    def test_spotify_top_snapshot_defaults(self):
        """Test SpotifyTopSnapshot default values."""
        snapshot = SpotifyTopSnapshot(
            user_id="test_user",
            snapshot_type="tracks",
            time_range="medium_term",
            items_json="[]",
        )

        assert snapshot.item_count == 0  # Default value

    def test_spotify_top_snapshot_tracks(self):
        """Test creating a tracks snapshot."""
        tracks_json = '''[
            {
                "id": "4iV5W9uYEdYUVa79Axb7Rh",
                "name": "Watermelon Sugar",
                "artists": [{"id": "0TnOYISbd1XYRBk9myaseg", "name": "Harry Styles"}]
            }
        ]'''

        snapshot = SpotifyTopSnapshot(
            user_id="test_user",
            snapshot_type="tracks",
            time_range="long_term",
            items_json=tracks_json,
            item_count=1,
        )

        assert snapshot.snapshot_type == "tracks"
        assert snapshot.time_range == "long_term"
        assert "Watermelon Sugar" in snapshot.items_json


class TestSpotifyModelsIntegration:
    """Integration tests for Spotify models with database."""

    @pytest.mark.asyncio
    async def test_listening_history_database_insert(self, async_session):
        """Test inserting a ListeningHistory record into the database."""
        listening = ListeningHistory(
            user_id="test_user",
            spotify_track_id="4iV5W9uYEdYUVa79Axb7Rh",
            spotify_artist_id="0TnOYISbd1XYRBk9myaseg",
            spotify_album_id="37i9dQZF1DX0XUsuxWHRQd",
            track_name="Watermelon Sugar",
            artist_name="Harry Styles",
            album_name="Fine Line",
            played_at_utc="2026-03-04T14:23:00.000Z",
            played_at_ts=1709556180000,
            duration_ms=174000,
            explicit=False,
            popularity=85,
        )

        async_session.add(listening)
        await async_session.commit()

        # Verify the record was saved
        assert listening.id is not None
        assert isinstance(listening.id, uuid.UUID)
        assert listening.created_at is not None
        assert listening.updated_at is not None

    @pytest.mark.asyncio
    async def test_spotify_top_snapshot_database_insert(self, async_session):
        """Test inserting a SpotifyTopSnapshot record into the database."""
        snapshot = SpotifyTopSnapshot(
            user_id="test_user",
            snapshot_type="artists",
            time_range="short_term",
            items_json='[{"id":"0TnOYISbd1XYRBk9myaseg","name":"Harry Styles"}]',
            item_count=1,
        )

        async_session.add(snapshot)
        await async_session.commit()

        # Verify the record was saved
        assert snapshot.id is not None
        assert isinstance(snapshot.id, uuid.UUID)
        assert snapshot.created_at is not None
        assert snapshot.updated_at is not None