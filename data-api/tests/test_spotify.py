"""Tests for Spotify listening history endpoints."""

from __future__ import annotations

import pytest

from tests.conftest import AUTH_HEADER

_SPOTIFY_ROUTES = [
    ("GET", "/spotify/plays/recent?user_id=default"),
    ("GET", "/spotify/plays/range?user_id=default&after_ts=0&before_ts=9999999999999"),
    ("GET", "/spotify/plays/stats?user_id=default"),
    ("GET", "/spotify/top/latest?user_id=default"),
    ("POST", "/spotify/sync?user_id=default"),
]


@pytest.mark.parametrize("method,path", _SPOTIFY_ROUTES)
async def test_spotify_routes_reject_no_auth(client, method, path):
    resp = await getattr(client, method.lower())(path)
    assert resp.status_code == 401, f"{method} {path} returned {resp.status_code}"


@pytest.mark.parametrize("method,path", _SPOTIFY_ROUTES)
async def test_spotify_routes_reject_bad_token(client, method, path):
    resp = await getattr(client, method.lower())(
        path, headers={"Authorization": "Bearer wrong"}
    )
    assert resp.status_code == 403, f"{method} {path} returned {resp.status_code}"


async def test_bulk_upsert_validates_body(client):
    resp = await client.post(
        "/spotify/plays/bulk",
        headers=AUTH_HEADER,
        json={},
    )
    assert resp.status_code == 422


async def test_bulk_upsert_rejects_empty_plays(client):
    resp = await client.post(
        "/spotify/plays/bulk",
        headers=AUTH_HEADER,
        json={"user_id": "default", "plays": []},
    )
    assert resp.status_code == 422


async def test_top_snapshot_validates_body(client):
    resp = await client.post(
        "/spotify/top/snapshot",
        headers=AUTH_HEADER,
        json={},
    )
    assert resp.status_code == 422


async def test_top_snapshot_rejects_invalid_type(client):
    resp = await client.post(
        "/spotify/top/snapshot",
        headers=AUTH_HEADER,
        json={
            "user_id": "default",
            "snapshot_type": "invalid",
            "time_range": "short_term",
            "items_json": "[]",
            "item_count": 0,
        },
    )
    assert resp.status_code == 422


async def test_top_snapshot_rejects_invalid_range(client):
    resp = await client.post(
        "/spotify/top/snapshot",
        headers=AUTH_HEADER,
        json={
            "user_id": "default",
            "snapshot_type": "artists",
            "time_range": "invalid",
            "items_json": "[]",
            "item_count": 0,
        },
    )
    assert resp.status_code == 422


async def test_recent_plays_requires_user_id(client):
    resp = await client.get("/spotify/plays/recent", headers=AUTH_HEADER)
    assert resp.status_code == 422


async def test_stats_requires_user_id(client):
    resp = await client.get("/spotify/plays/stats", headers=AUTH_HEADER)
    assert resp.status_code == 422


async def test_range_requires_timestamps(client):
    resp = await client.get(
        "/spotify/plays/range?user_id=default", headers=AUTH_HEADER
    )
    assert resp.status_code == 422
