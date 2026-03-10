---
name: aegis_spotify
description: "Spotify listening history, top artists/tracks, and listening stats"
---
# Aegis Spotify

Spotify listening intelligence — recently played tracks, top artists/tracks snapshots, listening stats, and time-range queries. Covers "what have I been listening to?", "who are my top artists?", and listening habit analysis.

## When to Use

Activate when the user asks about: music, Spotify, recently played, listening history, top artists, top tracks, listening stats, what they've been listening to, or music habits.

## API Reference

Base URL: `http://data-api:8000` -- All endpoints require `Authorization: Bearer $DATA_API_TOKEN`.
All endpoints are under `/spotify`.

### GET /spotify/plays/recent

Most recently played tracks, newest first.

Query params: `user_id` (default), `limit` (default 50, max 200).

```
web_fetch("http://data-api:8000/spotify/plays/recent?user_id=default&limit=20", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response:
```json
[
  {
    "id": "uuid",
    "track_name": "Blinding Lights",
    "artist_name": "The Weeknd",
    "album_name": "After Hours",
    "played_at_utc": "2026-03-10T14:23:00.000Z",
    "played_at_ts": 1773163380000,
    "duration_ms": 200040,
    "explicit": false,
    "popularity": 87,
    "context_type": "playlist",
    "energy": 0.73,
    "valence": 0.33,
    "tempo": 171.0,
    "danceability": 0.51
  }
]
```

### GET /spotify/plays/range

Plays within a Unix-millisecond timestamp range. Useful for daily/weekly recaps.

Query params: `user_id` (default), `after_ts` (required), `before_ts` (required), `limit` (default 200, max 1000).

```
web_fetch("http://data-api:8000/spotify/plays/range?user_id=default&after_ts=1773000000000&before_ts=1773200000000", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /spotify/plays/stats

Aggregate listening statistics for the last N days.

Query params: `user_id` (default), `period_days` (default 7, max 365).

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
  "total_minutes": 485.3,
  "unique_tracks": 87,
  "unique_artists": 34,
  "top_track_name": "Blinding Lights",
  "top_artist_name": "The Weeknd"
}
```

### GET /spotify/top/latest

Latest snapshot of top artists or tracks for a time range.

Query params: `user_id` (default), `snapshot_type` (`tracks` or `artists`), `time_range` (`short_term`, `medium_term`, `long_term`).

```
web_fetch("http://data-api:8000/spotify/top/latest?user_id=default&snapshot_type=artists&time_range=short_term", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### POST /spotify/plays/bulk

Upsert a batch of recently played tracks (max 50). Uses deduplication on (user_id, played_at_utc).

```
web_fetch("http://data-api:8000/spotify/plays/bulk", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN", "Content-Type": "application/json"},
  "body": "{\"user_id\": \"default\", \"plays\": [{\"user_id\": \"default\", \"spotify_track_id\": \"abc123\", \"spotify_artist_id\": \"art456\", \"spotify_album_id\": \"alb789\", \"track_name\": \"Song Name\", \"artist_name\": \"Artist\", \"album_name\": \"Album\", \"played_at_utc\": \"2026-03-10T14:00:00.000Z\", \"played_at_ts\": 1773163200000, \"duration_ms\": 210000}]}"
})
```

### POST /spotify/sync

Trigger a full Spotify sync (recently played + top snapshots).

```
web_fetch("http://data-api:8000/spotify/sync?user_id=default", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

## Guidelines

### Listening Reports

When reporting listening data, summarize concisely:
- "You listened to 142 tracks this week (8.1 hours). Top track: Blinding Lights (12 plays). Top artist: The Weeknd."
- For recent plays, list the last 5-10 tracks with artist names.

### Top Artists/Tracks

- `short_term` = last 4 weeks, `medium_term` = last 6 months, `long_term` = all time.
- When the user says "top artists" without specifying, use `medium_term` by default.

### Time Context

- **Morning briefing**: Include a one-liner about yesterday's listening if data exists.
- **"What did I listen to?"**: Default to recent plays (last 24h or last 20 tracks).
- **"My top artists this month"**: Use `short_term` top snapshot.

## Error Handling

- `401 Unauthorized` -- Bearer token missing or invalid
- `404 Not Found` -- Resource doesn't exist
- `422 Validation Error` -- Invalid request parameters
- `500 Internal Server Error` -- Integration failure; retry after sync
