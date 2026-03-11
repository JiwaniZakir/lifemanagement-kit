---
name: aegis_spotify
description: "Spotify listening history, top artists/tracks, and music stats"
---
# Aegis Spotify

Track and analyze Spotify listening history. Covers recently played tracks, listening statistics, top artists/tracks snapshots, and time-range queries.

## When to Use

Activate when the user asks about: music, what they've been listening to, top artists, top tracks, listening stats, Spotify, songs, playlists, or music trends.

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
    "track_name": "Bohemian Rhapsody",
    "artist_name": "Queen",
    "album_name": "A Night at the Opera",
    "played_at_utc": "2026-03-10T14:23:00.000Z",
    "duration_ms": 354000,
    "explicit": false,
    "popularity": 95,
    "context_type": "playlist"
  }
]
```

### GET /spotify/plays/range

Plays within a Unix-millisecond timestamp range. Useful for daily or weekly recaps.

Query params: `user_id` (default), `after_ts` (required), `before_ts` (required), `limit` (default 200).

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
  "total_minutes": 520.3,
  "unique_tracks": 87,
  "unique_artists": 34,
  "top_track_name": "Bohemian Rhapsody",
  "top_artist_name": "Queen"
}
```

### GET /spotify/top

Latest snapshot of top artists or tracks from Spotify.

Query params: `user_id` (default), `snapshot_type` ('tracks' or 'artists'), `time_range` ('short_term', 'medium_term', 'long_term').

```
web_fetch("http://data-api:8000/spotify/top?user_id=default&snapshot_type=artists&time_range=short_term", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
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

### Presenting Music Data

- Show track name, artist, and album when listing plays.
- For stats, highlight total listening time, unique artists, and top track/artist.
- Time ranges: "short_term" = last 4 weeks, "medium_term" = last 6 months, "long_term" = all time.

### Conversational Style

- "You listened to 142 tracks this week — 520 minutes total. Your most played track was Bohemian Rhapsody by Queen."
- Offer follow-ups: "Want to see your top artists this month?"

## Error Handling

- `401 Unauthorized` -- Bearer token missing or invalid
- `422 Validation Error` -- Invalid request parameters
- `500 Internal Server Error` -- Spotify API or integration failure; suggest retrying after sync
