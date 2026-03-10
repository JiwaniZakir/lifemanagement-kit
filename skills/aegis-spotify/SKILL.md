---
name: aegis_spotify
description: "Spotify listening history, top artists/tracks, and music stats"
---
# Aegis Spotify

Spotify listening history tracking, top artists and tracks, and listening statistics. Covers recently played tracks, time-range queries, aggregated stats, and top item snapshots.

## When to Use

Activate when the user asks about: music, Spotify, listening history, recently played, top artists, top tracks, what they've been listening to, music stats, or listening habits.

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
    "id": "...",
    "track_name": "Bohemian Rhapsody",
    "artist_name": "Queen",
    "album_name": "A Night at the Opera",
    "played_at_utc": "2026-03-10T14:23:00.000Z",
    "duration_ms": 354000,
    "explicit": false,
    "popularity": 91,
    "context_type": "playlist"
  }
]
```

### GET /spotify/plays/range

Plays within a Unix-ms timestamp range. Useful for daily/weekly recaps.

Query params: `user_id` (default), `after_ts` (required), `before_ts` (required), `limit` (default 200, max 1000).

```
web_fetch("http://data-api:8000/spotify/plays/range?user_id=default&after_ts=1710000000000&before_ts=1710086400000", {
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
  "total_minutes": 532.5,
  "unique_tracks": 87,
  "unique_artists": 34,
  "top_track_name": "Bohemian Rhapsody",
  "top_artist_name": "Queen"
}
```

### GET /spotify/top

Latest snapshot of top artists or tracks from Spotify.

Query params: `user_id` (default), `snapshot_type` (`tracks` or `artists`), `time_range` (`short_term`, `medium_term`, `long_term`).

```
web_fetch("http://data-api:8000/spotify/top?user_id=default&snapshot_type=artists&time_range=short_term", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### POST /spotify/sync

Trigger a Spotify data sync (recently played + top items).

```
web_fetch("http://data-api:8000/spotify/sync?user_id=default", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

## Guidelines

### Listening Recaps

When the user asks "what have I been listening to?", fetch recent plays and summarize the top 5-10 tracks with artist names. Group by artist if many plays from the same artist.

### Stats Presentation

Present stats conversationally: "You listened to 142 tracks (8.9 hours) over the past week. Your most-played track was Bohemian Rhapsody by Queen."

### Top Items

Use `short_term` (4 weeks) for "lately" or "recently". Use `medium_term` (6 months) for general questions. Use `long_term` for "all time" or "overall" questions.

### Time Ranges

Convert user language to timestamp ranges:
- "today" → midnight to now in Unix ms
- "yesterday" → previous midnight to midnight
- "this week" → Monday midnight to now

## Error Handling

- `401 Unauthorized` -- Bearer token missing or invalid
- `404 Not Found` -- Resource doesn't exist
- `422 Validation Error` -- Invalid request parameters
- `500 Internal Server Error` -- Integration failure; retry after sync
