---
name: aegis_spotify
description: "Spotify listening history tracking, recently played tracks, top artists, and music insights"
---
# Aegis Spotify

Spotify listening history tracking and music intelligence. Provides access to recently played tracks, listening statistics, top artists/tracks, and music patterns analysis.

## When to Use

Activate when the user asks about: recently played songs, music listening habits, favorite artists, top tracks, listening time, music discovery, weekly music summaries, or when they want to explore their Spotify data.

## API Reference

Base URL: `http://data-api:8000` -- All endpoints require `Authorization: Bearer $DATA_API_TOKEN`.
All endpoints are under `/api/v1/spotify`.

### POST /api/v1/spotify/sync

Sync latest Spotify listening data (recently played tracks and top snapshots).

```
web_fetch("http://data-api:8000/api/v1/spotify/sync?user_id=default", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response:
```json
{
  "synced_plays": 15,
  "skipped_duplicates": 3,
  "snapshots_updated": 6,
  "errors": []
}
```

### GET /api/v1/spotify/health

Check Spotify API connection health.

```
web_fetch("http://data-api:8000/api/v1/spotify/health?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response:
```json
{
  "healthy": true
}
```

### GET /api/v1/spotify/plays/recent

Get recently played tracks (newest first).

Query params: `user_id` (required), `limit` (default 50, max 200).

```
web_fetch("http://data-api:8000/api/v1/spotify/plays/recent?user_id=default&limit=20", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response:
```json
[
  {
    "id": "uuid",
    "user_id": "default",
    "spotify_track_id": "4iV5W9uYEdYUVa79Axb7Rh",
    "spotify_artist_id": "0TnOYISbd1XYRBk9myaseg",
    "track_name": "Watermelon Sugar",
    "artist_name": "Harry Styles",
    "album_name": "Fine Line",
    "played_at_utc": "2026-03-04T14:23:00.000Z",
    "played_at_ts": 1709556180000,
    "duration_ms": 174000,
    "explicit": false,
    "popularity": 85,
    "context_type": "playlist",
    "energy": 0.816,
    "valence": 0.557,
    "tempo": 95.0,
    "danceability": 0.548,
    "created_at": "2026-03-04T14:25:00Z"
  }
]
```

### GET /api/v1/spotify/plays/range

Get plays within a timestamp range.

Query params: `user_id` (required), `after_ts` (Unix ms), `before_ts` (Unix ms), `limit` (default 200, max 1000).

```
// Get yesterday's plays
const yesterday_start = Math.floor((Date.now() - 86400000) / 1000) * 1000;
const yesterday_end = Math.floor(Date.now() / 1000) * 1000;

web_fetch(`http://data-api:8000/api/v1/spotify/plays/range?user_id=default&after_ts=${yesterday_start}&before_ts=${yesterday_end}`, {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /api/v1/spotify/plays/stats

Get aggregate listening statistics for a period.

Query params: `user_id` (required), `period_days` (default 7, max 365).

```
web_fetch("http://data-api:8000/api/v1/spotify/plays/stats?user_id=default&period_days=30", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response:
```json
{
  "user_id": "default",
  "period_days": 30,
  "total_plays": 432,
  "total_minutes": 1620.5,
  "unique_tracks": 287,
  "unique_artists": 94,
  "top_track_name": "As It Was",
  "top_artist_name": "Harry Styles"
}
```

### GET /api/v1/spotify/top/{snapshot_type}

Get top artists or tracks snapshot for a time range.

Path params: `snapshot_type` ("artists" or "tracks")
Query params: `user_id` (required), `time_range` ("short_term", "medium_term", "long_term")

```
// Get top artists for the last 4 weeks
web_fetch("http://data-api:8000/api/v1/spotify/top/artists?user_id=default&time_range=short_term", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})

// Get top tracks for the last 6 months
web_fetch("http://data-api:8000/api/v1/spotify/top/tracks?user_id=default&time_range=medium_term", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response:
```json
{
  "id": "uuid",
  "user_id": "default",
  "snapshot_type": "artists",
  "time_range": "short_term",
  "items_json": "[{\"id\":\"0TnOYISbd1XYRBk9myaseg\",\"name\":\"Harry Styles\",\"genres\":[\"pop\"],\"popularity\":89}]",
  "item_count": 50,
  "created_at": "2026-03-04T14:00:00Z"
}
```

## Usage Examples

### Recent Music Activity
```javascript
// Check what user has been listening to lately
const recent = await web_fetch("http://data-api:8000/api/v1/spotify/plays/recent?user_id=default&limit=10", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
});

// Format for user
const tracks = JSON.parse(recent).map(play =>
  `${play.track_name} by ${play.artist_name} (${new Date(play.played_at_utc).toLocaleString()})`
).join('\n');
```

### Listening Statistics
```javascript
// Get weekly listening summary
const stats = await web_fetch("http://data-api:8000/api/v1/spotify/plays/stats?user_id=default&period_days=7", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
});

const summary = JSON.parse(stats);
// "This week you listened to 142 tracks for 8.5 hours. Your top song was 'Flowers' by Miley Cyrus."
```

### Music Discovery
```javascript
// Get top tracks from different time periods to see taste evolution
const short_term = await web_fetch("http://data-api:8000/api/v1/spotify/top/tracks?user_id=default&time_range=short_term", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
});

const long_term = await web_fetch("http://data-api:8000/api/v1/spotify/top/tracks?user_id=default&time_range=long_term", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
});
```

### Daily Music Recap
```javascript
// Get today's listening activity
const today_start = new Date().setHours(0,0,0,0);
const now = Date.now();

const today_plays = await web_fetch(`http://data-api:8000/api/v1/spotify/plays/range?user_id=default&after_ts=${today_start}&before_ts=${now}`, {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
});
```

## Data Sync

The Spotify integration automatically syncs:
- **Recently played tracks** (last 50 plays) every 30 minutes via cron
- **Top artists/tracks snapshots** for short_term (4 weeks), medium_term (6 months), and long_term (years) daily

Manual sync can be triggered via the `/sync` endpoint if needed.

## Setup Requirements

Before using this skill, ensure Spotify credentials are configured:
1. `spotify_client_id` - Spotify app client ID
2. `spotify_client_secret` - Spotify app client secret
3. `spotify_refresh_token` - OAuth refresh token (obtained via initial authorization flow)
4. `spotify_access_token` - Current access token (auto-refreshed by the client)

Use the `/credentials` endpoint to store these securely in the encrypted credential vault.