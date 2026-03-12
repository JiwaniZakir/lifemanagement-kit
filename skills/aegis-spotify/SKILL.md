---
name: aegis_spotify
description: "Spotify listening history, recently played tracks, top artists, top tracks, and listening stats"
---
# Aegis Spotify

Track and query Spotify listening history, recently played tracks, top artists and tracks, and aggregate listening statistics.

## When to Use

Activate when the user asks about: music, Spotify, what they've been listening to, top artists, top tracks, listening stats, recently played, or music trends.

## API Reference

Base URL: `http://data-api:8000` -- All endpoints require `Authorization: Bearer $DATA_API_TOKEN`.
All endpoints are under `/spotify`.

### POST /spotify/plays/bulk

Bulk upsert recently played tracks (max 50 per call). Used by sync.

```
web_fetch("http://data-api:8000/spotify/plays/bulk", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN", "Content-Type": "application/json"},
  "body": "{\"user_id\": \"default\", \"plays\": [{\"user_id\": \"default\", \"spotify_track_id\": \"abc\", \"spotify_artist_id\": \"def\", \"spotify_album_id\": \"ghi\", \"track_name\": \"Song\", \"artist_name\": \"Artist\", \"album_name\": \"Album\", \"played_at_utc\": \"2026-03-01T14:00:00Z\", \"played_at_ts\": 1772204400000, \"duration_ms\": 210000}]}"
})
```

### GET /spotify/plays/recent

Get the most recently played tracks.

Query params: `user_id` (required), `limit` (default 50, max 200).

```
web_fetch("http://data-api:8000/spotify/plays/recent?user_id=default&limit=20", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response: array of track play objects with `track_name`, `artist_name`, `album_name`, `played_at_utc`, `duration_ms`, `popularity`, `context_type`.

### GET /spotify/plays/range

Get plays within a timestamp range.

Query params: `user_id` (required), `after_ts` (Unix ms, required), `before_ts` (Unix ms, required), `limit` (default 200).

```
web_fetch("http://data-api:8000/spotify/plays/range?user_id=default&after_ts=1772100000000&before_ts=1772200000000", {
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
  "total_minutes": 472.3,
  "unique_tracks": 89,
  "unique_artists": 34,
  "top_track_name": "Bohemian Rhapsody",
  "top_artist_name": "Queen"
}
```

### POST /spotify/top/snapshot

Store a snapshot of top artists or tracks.

```
web_fetch("http://data-api:8000/spotify/top/snapshot", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN", "Content-Type": "application/json"},
  "body": "{\"user_id\": \"default\", \"snapshot_type\": \"artists\", \"time_range\": \"short_term\", \"items_json\": \"[...]\", \"item_count\": 20}"
})
```

### GET /spotify/top/latest

Get the latest top snapshot.

Query params: `user_id` (required), `snapshot_type` (`artists` or `tracks`, required), `time_range` (`short_term`, `medium_term`, or `long_term`, default `short_term`).

```
web_fetch("http://data-api:8000/spotify/top/latest?user_id=default&snapshot_type=artists&time_range=short_term", {
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

## Guidelines

### Answering Music Questions

- "What have I been listening to?" -> Use `/spotify/plays/recent` with a small limit.
- "What are my top artists/tracks?" -> Use `/spotify/top/latest` with the appropriate snapshot_type and time_range.
- "How much have I listened this week?" -> Use `/spotify/plays/stats?period_days=7`.
- "What did I listen to yesterday?" -> Use `/spotify/plays/range` with yesterday's timestamp range.

### Time Ranges for Top Content

- `short_term`: approximately last 4 weeks
- `medium_term`: approximately last 6 months
- `long_term`: calculated from several years of data

### Presentation

- Format track listings as: "**Track Name** by Artist Name"
- Include listening duration when relevant: "You listened to 7.8 hours of music this week"
- For top lists, number them: "1. Artist Name (15 plays)"

## Error Handling

- `401 Unauthorized` -- Bearer token missing or invalid
- `422 Validation Error` -- Invalid request parameters
- `500 Internal Server Error` -- Integration failure; retry after sync
