"""Tests for the Spotify API endpoints."""

from __future__ import annotations

from tests.conftest import AUTH_HEADER


async def test_recent_plays_empty(client):
    response = await client.get(
        "/spotify/plays/recent?user_id=testuser",
        headers=AUTH_HEADER,
    )
    assert response.status_code == 200
    assert response.json() == []


async def test_recent_plays_requires_auth(client):
    response = await client.get("/spotify/plays/recent?user_id=testuser")
    assert response.status_code == 401


async def test_plays_stats_empty(client):
    response = await client.get(
        "/spotify/plays/stats?user_id=testuser&period_days=7",
        headers=AUTH_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["period_days"] == 7
    assert data["total_plays"] == 0
    assert data["total_minutes"] == 0.0
    assert data["unique_tracks"] == 0
    assert data["unique_artists"] == 0
    assert data["top_track_name"] is None
    assert data["top_artist_name"] is None


async def test_plays_range_empty(client):
    response = await client.get(
        "/spotify/plays/range?user_id=testuser&after_ts=1000000000000&before_ts=2000000000000",
        headers=AUTH_HEADER,
    )
    assert response.status_code == 200
    assert response.json() == []


async def test_top_latest_empty(client):
    response = await client.get(
        "/spotify/top/latest?user_id=testuser&snapshot_type=tracks&time_range=medium_term",
        headers=AUTH_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["snapshot"] is None


async def test_bulk_upsert_plays(client):
    body = {
        "user_id": "testuser",
        "plays": [
            {
                "user_id": "testuser",
                "spotify_track_id": "track1",
                "spotify_artist_id": "artist1",
                "spotify_album_id": "album1",
                "track_name": "Test Song",
                "artist_name": "Test Artist",
                "album_name": "Test Album",
                "played_at_utc": "2026-03-10T14:00:00.000Z",
                "played_at_ts": 1773163200000,
                "duration_ms": 210000,
            }
        ],
    }
    response = await client.post(
        "/spotify/plays/bulk",
        json=body,
        headers=AUTH_HEADER,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["inserted"] == 1
    assert data["skipped"] == 0


async def test_bulk_upsert_deduplication(client):
    body = {
        "user_id": "testuser_dedup",
        "plays": [
            {
                "user_id": "testuser_dedup",
                "spotify_track_id": "track_dedup",
                "spotify_artist_id": "artist_dedup",
                "spotify_album_id": "album_dedup",
                "track_name": "Dedup Song",
                "artist_name": "Dedup Artist",
                "album_name": "Dedup Album",
                "played_at_utc": "2026-03-10T15:00:00.000Z",
                "played_at_ts": 1773166800000,
                "duration_ms": 180000,
            }
        ],
    }
    r1 = await client.post("/spotify/plays/bulk", json=body, headers=AUTH_HEADER)
    assert r1.status_code == 201
    assert r1.json()["inserted"] == 1

    r2 = await client.post("/spotify/plays/bulk", json=body, headers=AUTH_HEADER)
    assert r2.status_code == 201
    assert r2.json()["skipped"] == 1


async def test_create_top_snapshot(client):
    body = {
        "user_id": "testuser",
        "snapshot_type": "tracks",
        "time_range": "short_term",
        "items_json": '[{"name": "Track 1", "id": "t1"}]',
        "item_count": 1,
    }
    response = await client.post(
        "/spotify/top/snapshot",
        json=body,
        headers=AUTH_HEADER,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["ok"] is True
    assert "id" in data


async def test_recent_plays_after_insert(client):
    body = {
        "user_id": "testuser_recent",
        "plays": [
            {
                "user_id": "testuser_recent",
                "spotify_track_id": "track_r1",
                "spotify_artist_id": "artist_r1",
                "spotify_album_id": "album_r1",
                "track_name": "Recent Song",
                "artist_name": "Recent Artist",
                "album_name": "Recent Album",
                "played_at_utc": "2026-03-10T16:00:00.000Z",
                "played_at_ts": 1773170400000,
                "duration_ms": 200000,
                "explicit": True,
                "popularity": 85,
            }
        ],
    }
    await client.post("/spotify/plays/bulk", json=body, headers=AUTH_HEADER)

    response = await client.get(
        "/spotify/plays/recent?user_id=testuser_recent&limit=10",
        headers=AUTH_HEADER,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["track_name"] == "Recent Song"
    assert data[0]["artist_name"] == "Recent Artist"
    assert data[0]["explicit"] is True
    assert data[0]["popularity"] == 85
