---
name: aegis_spotify
description: "Spotify listening history, recently played tracks, top artists and tracks, and listening stats"
---
# Aegis Spotify

Track and query Spotify listening history, recently played tracks, top artists, top tracks, and aggregate listening statistics.

## When to Use

Activate when the user asks about: music, Spotify, what they've been listening to, top artists, top tracks, listening habits, music stats, recently played, or listening time.

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

Response: array of play objects with `track_name`, `artist_name`, `album_name`, `played_at_utc`, `duration_ms`, `popularity`, `context_type`.

### GET /spotify/plays/range

Plays within a Unix-millisecond timestamp range. Useful for daily/weekly recaps.

Query params: `user_id` (default), `after_ts` (required), `before_ts` (required), `limit` (default 200).

```
web_fetch("http://data-api:8000/spotify/plays/range?user_id=default&after_ts=1709251200000&before_ts=1709337600000", {
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

### GET /spotify/top/snapshot

Top artists or tracks snapshots from Spotify.

Query params: `user_id` (default), `snapshot_type` (optional: `artists` or `tracks`), `time_range` (optional: `short_term`, `medium_term`, `long_term`).

```
web_fetch("http://data-api:8000/spotify/top/snapshot?user_id=default&snapshot_type=artists&time_range=short_term", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### POST /spotify/sync

Trigger a Spotify data sync (recently played + top snapshots).

```
web_fetch("http://data-api:8000/spotify/sync?user_id=default", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### POST /spotify/plays/bulk

Bulk upsert play events (used by the sync integration).

```
web_fetch("http://data-api:8000/spotify/plays/bulk", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN", "Content-Type": "application/json"},
  "body": "{\"user_id\": \"default\", \"plays\": [{\"spotify_track_id\": \"...\", \"spotify_artist_id\": \"...\", \"spotify_album_id\": \"...\", \"track_name\": \"...\", \"artist_name\": \"...\", \"album_name\": \"...\", \"played_at_utc\": \"2026-03-09T14:00:00.000Z\", \"played_at_ts\": 1773075600000}]}"
})
```

### POST /spotify/top/snapshot

Upsert a top artists or tracks snapshot.

```
web_fetch("http://data-api:8000/spotify/top/snapshot", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN", "Content-Type": "application/json"},
  "body": "{\"user_id\": \"default\", \"snapshot_type\": \"artists\", \"time_range\": \"short_term\", \"items_json\": \"[...]\", \"item_count\": 20}"
})
```

## Guidelines

### Reporting Listening Data

- Present recently played tracks as a concise list: "Artist — Track (Album)".
- For stats, highlight total listening time, unique artists/tracks, and the top track/artist.
- Use natural phrasing: "You listened to 142 tracks this week (about 8 hours), mostly The Weeknd."

### Time Ranges for Top Items

- `short_term`: approximately last 4 weeks
- `medium_term`: approximately last 6 months
- `long_term`: calculated from several years of data

### Context

- If the user asks "what am I listening to?", use `/plays/recent` with a small limit.
- If the user asks about listening habits or stats, use `/plays/stats`.
- If the user asks about top artists or favorite music, use `/top/snapshot`.
- For "what did I listen to yesterday?", calculate the Unix-ms range and use `/plays/range`.

## Error Handling

- `401 Unauthorized` -- Bearer token missing or invalid
- `404 Not Found` -- Resource doesn't exist
- `422 Validation Error` -- Invalid request parameters
- `500 Internal Server Error` -- Integration failure; Spotify credentials may need re-authentication
