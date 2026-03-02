---
name: aegis_calendar
description: "Schedule and availability intelligence from Google Calendar and Outlook"
---
# Aegis Calendar

Schedule and availability intelligence from Google Calendar and Outlook. Covers today's events, multi-day lookups, free slot detection, and calendar sync.

## When to Use

Activate when the user asks about: today's schedule, upcoming meetings or events, whether they are free at a given time, finding open slots, meeting preparation, or when their calendar seems out of date.

## API Reference

Base URL: `http://data-api:8000` -- All endpoints require `Authorization: Bearer $DATA_API_TOKEN`.
All endpoints are under `/calendar`.

### GET /calendar/today

Today's events from all connected calendars, sorted by start time.

```
web_fetch("http://data-api:8000/calendar/today?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response:
```json
[
  {
    "title": "Team Standup",
    "start": "2026-02-28T09:00:00-05:00",
    "end": "2026-02-28T09:30:00-05:00",
    "location": "Zoom",
    "source": "google_calendar",
    "attendees": ["alice@example.com"]
  }
]
```

### GET /calendar/events

Events for the next N days.

Query params: `user_id` (default), `days` (default 7).

```
web_fetch("http://data-api:8000/calendar/events?user_id=default&days=7", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Returns: `{"events": [...], "count": 12, "days": 7}`

### GET /calendar/free

Free time slots for a given date.

Query params: `user_id` (default), `date` (YYYY-MM-DD, optional -- defaults to today).

```
web_fetch("http://data-api:8000/calendar/free?user_id=default&date=2026-02-28", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### POST /calendar/sync

Trigger a calendar sync from Google Calendar and Outlook.

```
web_fetch("http://data-api:8000/calendar/sync?user_id=default", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

## Guidelines

- Present events in chronological order. Use 12-hour format (9:00 AM, not 09:00).
- Group events by morning/afternoon/evening when listing a full day.
- Call out back-to-back meetings (less than 15 min gap) and total meeting hours.
- For free slot queries, only report gaps of 30+ minutes. Assume work day is 8:00 AM to 8:00 PM unless specified otherwise.
- Use relative language when helpful: "in 45 minutes", "this afternoon", "tomorrow morning".
- To check for conflicts, fetch events and compare time ranges for overlap.
- If data seems stale, call `POST /calendar/sync` first, then re-fetch.
