"""Calendar API — Google Calendar + Outlook event queries and sync."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from datetime import date as _date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.security.audit import audit_log

router = APIRouter(tags=["calendar"])


@router.get("/today")
async def get_today_events(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get today's calendar events."""
    from app.integrations.google_calendar_client import GoogleCalendarClient

    client = GoogleCalendarClient(user_id, db)
    return await client.get_today_events()


@router.get("/events")
async def get_events(
    user_id: str = Query(default="default"),
    days: int = Query(default=7, ge=1, le=90),
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get calendar events in a date range.

    Use ``days`` for a simple N-day window from today, or override with
    explicit ``start``/``end`` ISO datetimes.
    """
    from app.integrations.google_calendar_client import GoogleCalendarClient

    if start:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end) if end else start_dt + timedelta(days=days)
    else:
        start_dt = datetime.now(UTC)
        end_dt = datetime.fromisoformat(end) if end else start_dt + timedelta(days=days)

    client = GoogleCalendarClient(user_id, db)
    return await client.get_events(start=start_dt, end=end_dt)


@router.get("/free")
async def get_free_slots(
    user_id: str = Query(default="default"),
    date: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Find free time slots on a given day."""
    from app.integrations.google_calendar_client import GoogleCalendarClient

    target = _date.fromisoformat(date) if date else _date.today()
    day_start = datetime.combine(target, datetime.min.time(), tzinfo=UTC)
    day_end = day_start + timedelta(days=1)

    client = GoogleCalendarClient(user_id, db)
    events = await client.get_events(start=day_start, end=day_end)

    # Calculate free slots between events (9 AM - 6 PM working hours)
    work_start = day_start.replace(hour=9)
    work_end = day_start.replace(hour=18)

    busy = []
    for e in events:
        e_start = e.get("start", "")
        e_end = e.get("end", "")
        if e_start and e_end:
            try:
                busy.append((datetime.fromisoformat(e_start), datetime.fromisoformat(e_end)))
            except ValueError:
                continue

    busy.sort(key=lambda x: x[0])
    free_slots = []
    cursor = work_start

    for b_start, b_end in busy:
        if b_start > cursor:
            free_slots.append(
                {
                    "start": cursor.isoformat(),
                    "end": b_start.isoformat(),
                    "duration_minutes": int((b_start - cursor).total_seconds() / 60),
                }
            )
        cursor = max(cursor, b_end)

    if cursor < work_end:
        free_slots.append(
            {
                "start": cursor.isoformat(),
                "end": work_end.isoformat(),
                "duration_minutes": int((work_end - cursor).total_seconds() / 60),
            }
        )

    return free_slots


@router.post("/sync")
async def sync_calendar(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Trigger calendar sync (Google + Outlook)."""
    from app.integrations.google_calendar_client import GoogleCalendarClient

    results = {}
    try:
        gcal = GoogleCalendarClient(user_id, db)
        events = await gcal.get_events()
        results["google"] = {"ok": True, "events": len(events)}
    except Exception as exc:
        results["google"] = {"ok": False, "error": str(type(exc).__name__)}

    # Outlook
    try:
        from app.integrations.outlook_calendar_client import OutlookCalendarClient

        outlook = OutlookCalendarClient(user_id, db)
        outlook_result = await outlook.sync()
        results["outlook"] = outlook_result
    except Exception as exc:
        results["outlook"] = {"ok": False, "error": str(type(exc).__name__)}

    await audit_log(db, action="calendar_sync", resource_type="calendar", metadata=results)
    return {"ok": True, **results}
