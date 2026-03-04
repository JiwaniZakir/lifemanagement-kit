"""Tests for the Spotify API endpoints."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest


class TestSpotifyAPI:
    """Test suite for Spotify API endpoints."""

    @pytest.mark.asyncio
    async def test_spotify_health_endpoint_requires_auth(self, client):
        """Spotify health endpoint requires authentication."""
        response = await client.get("/api/v1/spotify/health?user_id=default")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_spotify_health_endpoint_with_auth(self, client, auth_headers):
        """Spotify health endpoint works with valid auth."""
        with patch("app.integrations.spotify_client.SpotifyClient") as mock_client_class:
            # Mock the SpotifyClient instance
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = None
            mock_client.health_check.return_value = True
            mock_client_class.return_value = mock_client

            response = await client.get(
                "/api/v1/spotify/health?user_id=default",
                headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert data["healthy"] is True

    @pytest.mark.asyncio
    async def test_spotify_sync_endpoint_requires_auth(self, client):
        """Spotify sync endpoint requires authentication."""
        response = await client.post("/api/v1/spotify/sync?user_id=default")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_spotify_sync_endpoint_with_auth(self, client, auth_headers):
        """Spotify sync endpoint works with valid auth."""
        with patch("app.integrations.spotify_client.SpotifyClient") as mock_client_class:
            # Mock the SpotifyClient instance
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = None
            mock_client.sync.return_value = {
                "synced_plays": 15,
                "skipped_duplicates": 3,
                "snapshots_updated": 6,
                "errors": []
            }
            mock_client_class.return_value = mock_client

            response = await client.post(
                "/api/v1/spotify/sync?user_id=default",
                headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert data["synced_plays"] == 15
            assert data["skipped_duplicates"] == 3
            assert data["snapshots_updated"] == 6
            assert data["errors"] == []

    @pytest.mark.asyncio
    async def test_recent_plays_endpoint_requires_auth(self, client):
        """Recent plays endpoint requires authentication."""
        response = await client.get("/api/v1/spotify/plays/recent?user_id=default")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_recent_plays_endpoint_returns_empty_list(self, client, auth_headers):
        """Recent plays endpoint returns empty list when no data."""
        response = await client.get(
            "/api/v1/spotify/plays/recent?user_id=default&limit=10",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0  # No data in test database

    @pytest.mark.asyncio
    async def test_listening_stats_endpoint_requires_auth(self, client):
        """Listening stats endpoint requires authentication."""
        response = await client.get("/api/v1/spotify/plays/stats?user_id=default")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_listening_stats_endpoint_with_auth(self, client, auth_headers):
        """Listening stats endpoint returns zero stats when no data."""
        response = await client.get(
            "/api/v1/spotify/plays/stats?user_id=default&period_days=7",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "default"
        assert data["period_days"] == 7
        assert data["total_plays"] == 0
        assert data["total_minutes"] == 0.0
        assert data["unique_tracks"] == 0
        assert data["unique_artists"] == 0
        assert data["top_track_name"] is None
        assert data["top_artist_name"] is None

    @pytest.mark.asyncio
    async def test_top_artists_endpoint_requires_auth(self, client):
        """Top artists endpoint requires authentication."""
        response = await client.get("/api/v1/spotify/top/artists?user_id=default")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_top_tracks_endpoint_requires_auth(self, client):
        """Top tracks endpoint requires authentication."""
        response = await client.get("/api/v1/spotify/top/tracks?user_id=default")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_top_artists_endpoint_returns_none_when_no_data(self, client, auth_headers):
        """Top artists endpoint returns None when no snapshot exists."""
        response = await client.get(
            "/api/v1/spotify/top/artists?user_id=default&time_range=short_term",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json() is None

    @pytest.mark.asyncio
    async def test_top_endpoint_validates_snapshot_type(self, client, auth_headers):
        """Top endpoint validates snapshot_type parameter."""
        response = await client.get(
            "/api/v1/spotify/top/invalid?user_id=default",
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "snapshot_type must be 'artists' or 'tracks'" in data["detail"]

    @pytest.mark.asyncio
    async def test_top_endpoint_validates_time_range(self, client, auth_headers):
        """Top endpoint validates time_range parameter."""
        response = await client.get(
            "/api/v1/spotify/top/artists?user_id=default&time_range=invalid",
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "time_range must be" in data["detail"]

    @pytest.mark.asyncio
    async def test_bulk_upsert_plays_requires_auth(self, client):
        """Bulk upsert plays endpoint requires authentication."""
        response = await client.post(
            "/api/v1/spotify/plays/bulk",
            json={"user_id": "default", "plays": []}
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_bulk_upsert_plays_validates_input(self, client, auth_headers):
        """Bulk upsert plays endpoint validates input."""
        response = await client.post(
            "/api/v1/spotify/plays/bulk",
            headers=auth_headers,
            json={"user_id": "default", "plays": []}  # Empty plays array
        )
        assert response.status_code == 422  # Validation error: min_length=1

    @pytest.mark.asyncio
    async def test_plays_range_endpoint_requires_auth(self, client):
        """Plays range endpoint requires authentication."""
        response = await client.get("/api/v1/spotify/plays/range?user_id=default&after_ts=0&before_ts=1000000000000")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_plays_range_endpoint_returns_empty_list(self, client, auth_headers):
        """Plays range endpoint returns empty list when no data."""
        response = await client.get(
            "/api/v1/spotify/plays/range?user_id=default&after_ts=0&before_ts=9999999999999",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    @pytest.mark.asyncio
    async def test_delete_listening_history_requires_auth(self, client):
        """Delete listening history endpoint requires authentication."""
        response = await client.delete("/api/v1/spotify/plays?user_id=default")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_listening_history_with_auth(self, client, auth_headers):
        """Delete listening history endpoint works with valid auth."""
        response = await client.delete(
            "/api/v1/spotify/plays?user_id=default",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data
        assert isinstance(data["deleted"], int)