---
name: aegis_briefing
description: "Morning briefing and weekly digest composition"
---
# Aegis Briefing

Morning briefing and weekly digest composition. This skill gives agents the ability to assemble comprehensive briefings by pulling data from all other Aegis data skills (finance, calendar, LMS, health) and composing them into concise, actionable summaries delivered via WhatsApp.

## When to Use

Activate this skill when:
- The daily 6:00 AM cron job fires for the morning briefing
- The Sunday 8:00 PM cron job fires for the weekly digest
- The user asks for a summary of their day, week, or current status
- The user asks "what do I need to know right now?"
- Any request that requires cross-domain aggregation (finance + calendar + health + assignments)

This skill depends on: `aegis-finance`, `aegis-calendar`, `aegis-lms`, `aegis-health`.

## API Reference

Base URL: `http://data-api:8000`
All endpoints require: `Authorization: Bearer $DATA_API_TOKEN`
No `/api/v1` prefix -- endpoints are at the root.

### GET /briefing/today

Aggregate today's briefing data across all domains (finance, academics, health, budget).

```
web_fetch("http://data-api:8000/briefing/today?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response shape:
```json
{
  "date": "2026-02-27",
  "finance": {
    "total_balance": 12500.00,
    "today_transactions": 3,
    "today_spending": 45.20
  },
  "academics": {
    "due_today": 1,
    "due_tomorrow": 2,
    "overdue": 1
  },
  "health": {
    "steps": 6420,
    "calories": 1450,
    "protein_g": 112
  },
  "budget": {
    "daily_spend_usd": 1.25,
    "daily_limit_usd": 5.00
  }
}
```

### GET /briefing/weekly

Aggregate the past 7 days for the weekly digest.

```
web_fetch("http://data-api:8000/briefing/weekly?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response shape:
```json
{
  "period": {"start": "2026-02-20", "end": "2026-02-27"},
  "finance": {"total_spent": 1420.50, "top_categories": [...]},
  "academics": {"completed": 4, "submitted": 2, "upcoming": 3},
  "health": {"avg_steps": 8900, "avg_sleep_hours": 7.1, "avg_protein_g": 148},
  "budget": {"week_spend_usd": 8.75, "weekly_limit_usd": 35.00}
}
```

### GET /briefing/insights

Cross-domain insights: spending, health, and academic trends over N days.

Query parameters: `user_id` (default), `days` (default 30, min 7, max 365).

```
web_fetch("http://data-api:8000/briefing/insights?user_id=default&days=30", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

## Guidelines

### Morning Briefing Composition

The morning briefing runs daily at 6:00 AM. It must be:

1. **Concise** -- The user reads this on their phone. No walls of text.
2. **Actionable** -- Every item should answer "what do I need to do about this?"
3. **Prioritized** -- Most important items first.
4. **Complete** -- Cover all domains, even if briefly.

#### Standard Briefing Structure

Follow this order every time:

1. **Greeting + Weather** -- "Good morning. It is [day], [date]."
2. **Today's Schedule** -- Number of events, first event time, any conflicts.
3. **Urgent Deadlines** -- Overdue or due-today assignments.
4. **Financial Snapshot** -- Weekly spending vs last week, any unusual charges.
5. **Health Check** -- Yesterday's protein/calorie/sleep vs goals.
6. **Action Items** -- Top 3 things to focus on today.
7. **Follow-ups** -- Contacts to reach out to (if any).

#### Brevity Rules

- Schedule: Max 5 events listed. If more, say "and N more events."
- Assignments: Only show overdue + due within 48 hours.
- Finance: One line for spending, one for portfolio. No transaction details.
- Health: One line comparing yesterday's protein and sleep to goals.
- Action items: Exactly 3. No more.

### Weekly Digest Composition

The weekly digest runs Sunday at 8:00 PM. It is a reflection and preview.

#### Standard Digest Structure

1. **Week in Review** -- "Here is your week of [date range]."
2. **Schedule Recap** -- Total meetings, total hours in meetings, busiest day.
3. **Academic Progress** -- Assignments completed, grades received, upcoming deadlines next week.
4. **Financial Summary** -- Total spending, comparison to previous week, top 3 categories.
5. **Health Trends** -- Average protein/calories/sleep/steps for the week, vs goals.
6. **Next Week Preview** -- Key events and deadlines for the upcoming week.
7. **Highlights** -- One positive callout (best grade, spending under budget, sleep goal hit, etc.).

### Data Aggregation Strategy

When composing briefings, fetch data in this order to handle partial failures gracefully:

1. Calendar (`GET /calendar/today`) -- Most critical, affects the user's immediate schedule.
2. Assignments (`GET /lms/due?days=2`) -- Time-sensitive. Response includes `overdue` boolean per assignment.
3. Finance (`GET /finance/snapshot`) -- Quick overview.
4. Health (`GET /health/today`) -- Daily check.

If any data source fails, skip that section with a note: "Finance data unavailable -- sync may be needed." NEVER block the entire briefing because one source is down.

Alternatively, use `GET /briefing/today` or `GET /briefing/today` which handles this aggregation server-side with graceful fallbacks.

### Delivery Formatting

Briefings are delivered via WhatsApp through OpenClaw. Format accordingly:

- Use plain text with line breaks (no markdown -- WhatsApp does not render it well).
- Use simple bullet points with `-` or numbers.
- Keep total message under 2000 characters for WhatsApp compatibility.
- If the briefing exceeds 2000 characters, split into 2 messages: "Schedule + Deadlines" and "Finance + Health + Actions."

### Time Sensitivity

- Morning briefing at 6 AM should reference "today" for current day events.
- If the user asks for a briefing mid-day, adjust: skip past events, focus on remaining schedule.
- Weekly digest at 8 PM Sunday should say "this past week" and "next week."

## Examples

### Example 1: Morning Briefing (Cron Job)

**Trigger:** 6:00 AM daily cron.

**Agent behavior:**
1. Call `GET /briefing/today` to generate the briefing server-side.
2. Format the response for WhatsApp delivery.

**Delivered message:**
```
Good morning. It is Thursday, February 27.

SCHEDULE (4 events, 3.5 hrs)
- 9:00 AM Team Standup (Zoom)
- 11:00 AM CS 383 Lecture (Korman 101)
- 2:00 PM Sprint Planning (Conf Room B)
- 4:30 PM 1:1 with Sarah (Teams)

DEADLINES
- CS 260 Lab 5: Binary Trees -- due TOMORROW 11:59 PM (100 pts)
- CS 164 Homework 3 -- OVERDUE by 2 days (50 pts)

MONEY
- This week: $485 spent (down 5% vs last week)
- Portfolio: $45,230

HEALTH (yesterday)
- Protein: 148g / 175g (85%) -- close but short
- Sleep: 7.2 hrs -- on target

TOP 3 TODAY
1. Submit CS 164 HW3 (overdue)
2. Work on CS 260 Lab 5 before tomorrow's deadline
3. Prep for Sprint Planning -- check last week's action items

Reach out to: Sarah Chen (no contact in 14 days)
```

### Example 2: Weekly Digest

**Trigger:** Sunday 8:00 PM cron.

**Agent behavior:**
1. Call `GET /briefing/weekly`.
2. Supplement with `GET /briefing/insights?days=7` for health and productivity data.
3. Format for WhatsApp.

**Delivered message:**
```
WEEKLY DIGEST -- Feb 21-27

SCHEDULE
- 18 meetings this week (12.5 hours)
- Busiest day: Wednesday (5 meetings)

ACADEMICS
- 4 assignments submitted
- Best grade: CS 260 Quiz 3 (88%)
- Next week: 3 assignments due (CS 260 Lab 6, ENGL paper, PHYS PS7)

SPENDING
- Total: $1,420 (down 3% vs last week)
- Top: Food $485, Transport $312, Shopping $156
- Subscriptions: $188/month ($2,256/year)

HEALTH AVERAGES
- Protein: 148g/day (vs 175g goal -- 85%)
- Calories: 1,820/day (vs 1,900 limit -- good)
- Sleep: 7.1 hrs/day (up from 6.5 last week)
- Steps: 8,900/day (vs 10k goal -- 89%)

HIGHLIGHT
Your sleep improved significantly this week -- up 0.6 hours per night. Keep the consistent bedtime going.

NEXT WEEK PREVIEW
- Mon: CS 260 Lab 6 due
- Wed: ENGL 103 paper due
- Thu: Dentist appointment 2:00 PM
- Fri: PHYS 201 Problem Set 7 due
```

### Example 3: On-Demand Status Check

**User:** Give me a quick status update.

**Agent behavior:**
1. Call `GET /briefing/today` for the compact version.
2. Supplement with any specific data the highlights suggest.

**Response:**
> Here is where things stand right now:
>
> You have 2 more events today (Sprint Planning at 2:00 PM, 1:1 at 4:30 PM). Your CS 260 lab is due tomorrow night and the CS 164 homework is overdue. Spending is on track this week at $485, down 5% from last week. You are at 112g protein so far today -- need 63g more to hit your target. Sleep was solid at 7.2 hours last night.
>
> Priority: submit that CS 164 homework and then lock in time for the CS 260 lab.
