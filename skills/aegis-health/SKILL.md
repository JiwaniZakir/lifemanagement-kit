---
name: aegis_health
description: "Fitness, sleep, nutrition, and wellness intelligence from Garmin and Apple Health"
---
# Aegis Health

Fitness, sleep, nutrition, and wellness intelligence from Garmin Connect and Apple Health. Covers daily metrics, macro tracking, goal progress, trends, weekly summaries, and health data ingestion.

## When to Use

Activate when the user asks about: steps, heart rate, sleep, protein, calories, macros, health goals, weekly trends, workout summaries, or when they need to log health data.

## API Reference

Base URL: `http://data-api:8000` -- All endpoints require `Authorization: Bearer $DATA_API_TOKEN`.
All endpoints are under `/health`.

### GET /health/today

Today's health metrics snapshot.

```
web_fetch("http://data-api:8000/health/today?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response:
```json
{
  "date": "2026-02-28",
  "steps": 6420,
  "calories_consumed": 1450,
  "calories_burned": 2100,
  "protein_g": 112,
  "carbs_g": 180,
  "fat_g": 55,
  "sleep_hours": 7.2,
  "resting_heart_rate": 62,
  "active_minutes": 45,
  "water_oz": 64
}
```

### GET /health/summary

Health summary for a given period.

Query params: `user_id` (default), `days` (default 7).

```
web_fetch("http://data-api:8000/health/summary?user_id=default&days=7", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /health/trends

Trends for a specific metric type over time.

Query params: `user_id` (default), `metric_type` (e.g. `steps`, `protein_g`, `sleep_hours`), `days` (default 30).

```
web_fetch("http://data-api:8000/health/trends?user_id=default&metric_type=protein_g&days=14", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /health/goals

Today's metrics compared against configured health goals.

```
web_fetch("http://data-api:8000/health/goals?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /health/macros

Macro breakdown (protein, carbs, fat, calories) versus daily targets.

```
web_fetch("http://data-api:8000/health/macros?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /health/weekly

Weekly health summaries with daily breakdowns.

Query params: `user_id` (default), `weeks` (default 4).

```
web_fetch("http://data-api:8000/health/weekly?user_id=default&weeks=4", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### POST /health/ingest

Ingest health data (from Apple Health exports, iOS Shortcuts, or manual entry).

```
web_fetch("http://data-api:8000/health/ingest", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN", "Content-Type": "application/json"},
  "body": "{\"user_id\": \"default\", \"metrics\": [{\"metric_type\": \"steps\", \"value\": 8500, \"unit\": \"count\", \"source\": \"apple_health\", \"timestamp\": \"2026-02-28T18:00:00Z\"}]}"
})
```

### POST /health/sync

Trigger a Garmin health data sync.

```
web_fetch("http://data-api:8000/health/sync?user_id=default", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

## Guidelines

### Daily Goals

Refer to USER.md for personalized targets (protein, calories, steps, sleep, water). Always use the user's configured goals rather than hardcoded values.

### Progress Reporting

Always show actuals vs goals: "112g / 175g protein (64%) -- 63g more needed."

- **On track** (80%+ by proportional time of day): report positively.
- **Behind**: note deficit and suggest catch-up (e.g., "A chicken breast and a protein shake would cover it").
- **Over limit** (calories): flag clearly without judgment.

### Trend Analysis

Fetch 7-day data via `GET /health/summary?days=7`. Calculate averages, compare to goals, identify patterns ("You consistently fall short on protein on weekends").

### Time-of-Day Context

- **Morning**: focus on goals for the day, lunch planning for protein.
- **Afternoon**: show progress, estimate dinner needs.
- **Evening**: summarize the day, note final deficits.

### Nutrition Notes

- Protein is a priority goal. Suggest high-protein foods when behind.
- The calorie limit is an intentional deficit. Do not suggest eating more unless asked.
- NEVER provide medical advice. Report data and compare to stated goals only.

## Error Handling

- `401 Unauthorized` -- Bearer token missing or invalid
- `404 Not Found` -- Resource doesn't exist
- `422 Validation Error` -- Invalid request parameters
- `500 Internal Server Error` -- Integration failure; retry after sync
