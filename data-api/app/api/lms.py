"""LMS API — Canvas and Blackboard assignment and grade queries."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.assignment import Assignment
from app.security.audit import audit_log

router = APIRouter(tags=["lms"])


@router.get("/courses")
async def get_courses(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List active courses from Canvas."""
    from app.integrations.canvas_client import CanvasClient

    client = CanvasClient(user_id, db)
    return await client.get_courses()


@router.get("/due")
async def get_due_assignments(
    user_id: str = Query(default="default"),
    days: int = Query(default=7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get assignments due within N days."""
    now = datetime.now(UTC)
    cutoff = now + timedelta(days=days)

    stmt = (
        select(Assignment)
        .where(
            and_(
                Assignment.user_id == user_id,
                Assignment.status == "pending",
                Assignment.due_date.isnot(None),
                Assignment.due_date <= cutoff,
            )
        )
        .order_by(Assignment.due_date)
    )
    result = await db.execute(stmt)
    assignments = result.scalars().all()

    return [
        {
            "id": str(a.id),
            "platform": a.platform,
            "course": a.course,
            "title": a.title,
            "due_date": a.due_date.isoformat() if a.due_date else None,
            "status": a.status,
            "type": a.assignment_type,
            "url": a.url,
            "overdue": a.due_date < now if a.due_date else False,
        }
        for a in assignments
    ]


@router.get("/grades")
async def get_grades(
    user_id: str = Query(default="default"),
    course_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get grades from Canvas."""
    from app.integrations.canvas_client import CanvasClient

    client = CanvasClient(user_id, db)
    if course_id is None:
        courses = await client.get_courses()
        all_grades = []
        for c in courses[:5]:  # Limit to 5 courses to avoid rate limits
            grades = await client.get_grades(c["id"])
            for g in grades:
                g["course"] = c["name"]
            all_grades.extend(grades)
        return all_grades
    return await client.get_grades(course_id)


@router.get("/announcements")
async def get_announcements(
    user_id: str = Query(default="default"),
    course_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get recent announcements for a course."""
    from app.integrations.canvas_client import CanvasClient

    client = CanvasClient(user_id, db)
    return await client.get_announcements(course_id)


@router.post("/sync")
async def sync_lms(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Trigger LMS sync (Canvas + Blackboard)."""
    results = {}

    # Canvas
    try:
        from app.integrations.canvas_client import CanvasClient

        client = CanvasClient(user_id, db)
        await client.sync()
        results["canvas"] = {"ok": True}
    except Exception as exc:
        results["canvas"] = {"ok": False, "error": str(type(exc).__name__)}

    # Blackboard
    try:
        from app.integrations.blackboard_client import BlackboardClient

        bb = BlackboardClient(user_id, db)
        bb_result = await bb.sync()
        results["blackboard"] = bb_result
    except Exception as exc:
        results["blackboard"] = {"ok": False, "error": str(type(exc).__name__)}

    await audit_log(db, action="lms_sync", resource_type="assignment", metadata=results)
    return {"ok": True, **results}
