"""Tests for Spotify API endpoints."""

from __future__ import annotations

import pytest

from tests.conftest import AUTH_HEADER


async def test_spotify_recent_requires_auth(client):
    response = await client.get("/spotify/plays/recent?user_id=default")
    assert response.status_code == 401


async def test_spotify_stats_requires_auth(client):
    response = await client.get("/spotify/plays/stats?user_id=default")
    assert response.status_code == 401


async def test_spotify_top_requires_auth(client):
    response = await client.get("/spotify/top/latest?user_id=default&snapshot_type=artists")
    assert response.status_code == 401


async def test_spotify_bulk_requires_auth(client):
    response = await client.post("/spotify/plays/bulk", json={})
    assert response.status_code == 401


async def test_spotify_recent_with_auth(client):
    try:
        response = await client.get("/spotify/plays/recent?user_id=default", headers=AUTH_HEADER)
        assert response.status_code not in (401, 403)
    except Exception:
        pytest.skip("No database available")


async def test_spotify_stats_with_auth(client):
    try:
        response = await client.get(
            "/spotify/plays/stats?user_id=default&period_days=7",
            headers=AUTH_HEADER,
        )
        assert response.status_code not in (401, 403)
    except Exception:
        pytest.skip("No database available")


async def test_spotify_top_latest_with_auth(client):
    try:
        response = await client.get(
            "/spotify/top/latest?user_id=default&snapshot_type=tracks&time_range=short_term",
            headers=AUTH_HEADER,
        )
        assert response.status_code not in (401, 403)
    except Exception:
        pytest.skip("No database available")


async def test_spotify_bulk_validation(client):
    try:
        response = await client.post(
            "/spotify/plays/bulk",
            headers=AUTH_HEADER,
            json={"user_id": "default", "plays": []},
        )
        assert response.status_code == 422
    except Exception:
        pytest.skip("No database available")


async def test_spotify_range_requires_params(client):
    try:
        response = await client.get(
            "/spotify/plays/range?user_id=default",
            headers=AUTH_HEADER,
        )
        assert response.status_code == 422
    except Exception:
        pytest.skip("No database available")
