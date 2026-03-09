---
name: aegis_spotify
description: "Spotify listening history, top artists/tracks, and music stats"
---
# Aegis Spotify

Spotify listening history tracking: recently played tracks, top artists/tracks over configurable time ranges, and aggregate listening statistics.

## When to Use

Activate when the user asks about: music, Spotify, listening history, recently played, top artists, top tracks, what they've been listening to, listening stats, or music trends.

## API Reference

Base URL: `http://data-api:8000` -- All endpoints require `Authorization: Bearer $DATA_API_TOKEN`.
All endpoints are under `/spotify`.

### GET /spotify/plays/recent

Most recently played tracks, newest first.

Query params: `user_id` (required), `limit` (default 50, max 200).

```
web_fetch("http://data-api:8000/spotify/plays/recent?user_id=default&limit=20", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response: array of play objects with `track_name`, `artist_name`, `album_name`, `played_at_utc`, `duration_ms`, `popularity`, `context_type`, audio features (`energy`, `valence`, `tempo`, `danceability`).

### GET /spotify/plays/range

Plays within a Unix-millisecond timestamp range. Useful for "what did I listen to yesterday?" or weekly recaps.

Query params: `user_id` (required), `after_ts` (required, Unix ms), `before_ts` (required, Unix ms), `limit` (default 200, max 1000).

```
web_fetch("http://data-api:8000/spotify/plays/range?user_id=default&after_ts=1709251200000&before_ts=1709337600000", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /spotify/plays/stats

Aggregate listening statistics for the last N days.

Query params: `user_id` (required), `period_days` (default 7, max 365).

```
web_fetch("http://data-api:8000/spotify/plays/stats?user_id=default&period_days=7", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response:
```json
{
  "user_id": "default",
  "period_days": 7,
  "total_plays": 142,
  "total_minutes": 487.3,
  "unique_tracks": 89,
  "unique_artists": 34,
  "top_track_name": "Bohemian Rhapsody",
  "top_artist_name": "Queen"
}
```

### GET /spotify/top/latest

Latest top artist or track snapshots from Spotify.

Query params: `user_id` (required), `snapshot_type` ("artists" or "tracks", default "artists").

```
web_fetch("http://data-api:8000/spotify/top/latest?user_id=default&snapshot_type=artists", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response: array of snapshot objects with `snapshot_type`, `time_range` (short_term/medium_term/long_term), `items_json` (JSON string of Spotify artist/track objects), `item_count`.

### POST /spotify/sync

Trigger a Spotify data sync (recently played + top snapshots).

```
web_fetch("http://data-api:8000/spotify/sync?user_id=default", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

## Guidelines

### Presenting Listening Data

- Show track name, artist, and album for recent plays.
- For stats, highlight total listening time, unique tracks/artists, and top track/artist.
- When comparing periods, calculate percentage changes (e.g., "You listened 20% more this week").

### Time Ranges for Top Snapshots

- **short_term**: ~last 4 weeks
- **medium_term**: ~last 6 months
- **long_term**: several years of data

### Context Types

Plays may include a `context_type`: "playlist", "album", "artist", or null (direct play). Use this to add context like "from your Discover Weekly playlist".

### Audio Features

When available, use audio features to describe mood:
- **energy** (0-1): intensity and activity level
- **valence** (0-1): musical positiveness (high = happy, low = sad)
- **tempo**: BPM
- **danceability** (0-1): how suitable for dancing

Example: "Your recent listening has been high-energy (avg 0.8) and upbeat (valence 0.7)."

## Error Handling

- `401 Unauthorized` -- Bearer token missing or invalid
- `404 Not Found` -- Resource doesn't exist
- `422 Validation Error` -- Invalid request parameters
- `500 Internal Server Error` -- Integration failure; retry after sync
