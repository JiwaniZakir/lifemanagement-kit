---
name: aegis_lms
description: "Coursework, grades, and deadline intelligence from Canvas LMS and Blackboard"
---
# Aegis LMS

Coursework, grades, and deadline intelligence from Canvas LMS and Blackboard Learn. Covers courses, upcoming assignments, grades, announcements, and LMS sync.

## When to Use

Activate when the user asks about: upcoming assignments or deadlines, overdue work, grades for a course or overall, course announcements, academic workload, or prioritization of schoolwork.

## API Reference

Base URL: `http://data-api:8000` -- All endpoints require `Authorization: Bearer $DATA_API_TOKEN`.
All endpoints are under `/lms`.

### GET /lms/courses

All enrolled courses across Canvas and Blackboard.

```
web_fetch("http://data-api:8000/lms/courses?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /lms/due

Upcoming assignments sorted by due date.

```
web_fetch("http://data-api:8000/lms/due?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response:
```json
[
  {
    "id": "canvas-12345",
    "title": "Lab 5: Binary Trees",
    "course": "CS 260 - Data Structures",
    "due_date": "2026-02-28T23:59:00Z",
    "source": "canvas",
    "points_possible": 100,
    "submitted": false,
    "url": "https://canvas.drexel.edu/courses/123/assignments/12345"
  }
]
```

### GET /lms/grades

Grades for all courses. Filter by course if needed.

```
web_fetch("http://data-api:8000/lms/grades?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /lms/announcements

Course announcements. Requires `course_id`.

```
web_fetch("http://data-api:8000/lms/announcements?user_id=default&course_id=CS260", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### POST /lms/sync

Trigger a full LMS sync (Canvas, Blackboard).

```
web_fetch("http://data-api:8000/lms/sync?user_id=default", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

## Guidelines

### Prioritization

When presenting assignments, sort by urgency:
1. **Overdue** -- past due, not submitted. Highest priority.
2. **Critical** -- due within 24 hours.
3. **High** -- due within 48 hours.
4. **Medium** -- due within 7 days.
5. **Low** -- due beyond 7 days.

Within the same urgency tier, higher point value wins.

### Deadline Formatting

- Within 48 hours: use relative time ("due in 6 hours", "due tomorrow at 11:59 PM").
- Beyond 48 hours: use absolute dates ("due Friday, March 1 at 11:59 PM").
- Always include the time component. Group by course when listing multiple items.

### Grade Reporting

- Show scores as both raw and percentage: "85/100 (85%)".
- Compare recent grades to the course average when relevant.
- NEVER speculate about what grade is "needed" for an A. Present facts only.

### Overdue Work

- Always mention overdue assignments at the top of any response, even if not asked.
- Be direct: "You have 2 overdue assignments" -- no judgment.
- Note how many days overdue each item is.

### Cross-Referencing

- If a class session is on the calendar for a course with an upcoming deadline, mention it.
- If a heavy meeting day overlaps with a deadline, warn about the time crunch.

## Error Handling

- `401 Unauthorized` -- Bearer token missing or invalid
- `404 Not Found` -- Resource doesn't exist
- `422 Validation Error` -- Invalid request parameters
- `500 Internal Server Error` -- Integration failure; retry after sync
