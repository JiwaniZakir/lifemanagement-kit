"""Health API — Garmin + iOS Shortcuts health metric ingestion and queries."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.health_metric import HealthMetric
from app.security.audit import audit_log

router = APIRouter(tags=["health"])


@router.get("/today")
async def get_today_metrics(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get today's health metrics with goal progress."""
    settings = get_settings()
    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=UTC)
    today_end = today_start + timedelta(days=1)

    stmt = select(HealthMetric).where(
        and_(
            HealthMetric.user_id == user_id,
            HealthMetric.timestamp >= today_start,
            HealthMetric.timestamp < today_end,
        )
    )
    result = await db.execute(stmt)
    metrics = result.scalars().all()

    # Aggregate by metric type
    aggregated: dict[str, float] = {}
    for m in metrics:
        if m.metric_type in aggregated:
            aggregated[m.metric_type] += m.value
        else:
            aggregated[m.metric_type] = m.value

    return {
        "date": date.today().isoformat(),
        "steps": round(aggregated.get("steps", 0)),
        "protein_g": round(aggregated.get("protein", 0), 1),
        "calories_consumed": round(aggregated.get("calories", 0), 1),
        "calories_burned": round(aggregated.get("calories_burned", 0), 1),
        "sleep_hours": round(aggregated.get("sleep_hours", 0), 1),
        "goals": {
            "protein_g": settings.daily_protein_target_g,
            "calories": settings.daily_calorie_limit,
        },
        "goal_progress": {
            "protein_pct": round(
                aggregated.get("protein", 0) / settings.daily_protein_target_g * 100, 1
            )
            if settings.daily_protein_target_g
            else 0,
            "calories_pct": round(
                aggregated.get("calories_burned", 0) / settings.daily_calorie_limit * 100, 1
            )
            if settings.daily_calorie_limit
            else 0,
        },
    }


@router.get("/summary")
async def get_health_summary(
    user_id: str = Query(default="default"),
    days: int = Query(default=7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get daily health summaries for N days."""
    cutoff = datetime.now(UTC) - timedelta(days=days)

    stmt = (
        select(
            func.date(HealthMetric.timestamp).label("day"),
            HealthMetric.metric_type,
            func.sum(HealthMetric.value).label("total"),
            func.avg(HealthMetric.value).label("avg"),
        )
        .where(
            and_(
                HealthMetric.user_id == user_id,
                HealthMetric.timestamp >= cutoff,
            )
        )
        .group_by(func.date(HealthMetric.timestamp), HealthMetric.metric_type)
        .order_by(func.date(HealthMetric.timestamp).desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "date": str(row.day),
            "metric_type": row.metric_type,
            "total": round(float(row.total), 2),
            "avg": round(float(row.avg), 2),
        }
        for row in rows
    ]


class MetricItem(BaseModel):
    metric_type: str = Field(max_length=50)
    value: float
    unit: str = Field(default="count", max_length=20)
    timestamp: str | None = None
    source: str = Field(default="api", max_length=50)


class HealthIngestRequest(BaseModel):
    user_id: str = Field(max_length=36)
    metrics: list[MetricItem] = Field(max_length=1000)


@router.post("/ingest")
async def ingest_health_data(
    body: HealthIngestRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Ingest health metrics (from iOS Shortcuts, Garmin, etc.)."""
    stored = 0
    for m in body.metrics:
        try:
            ts = datetime.fromisoformat(m.timestamp) if m.timestamp else datetime.now(UTC)
        except ValueError:
            ts = datetime.now(UTC)

        record = HealthMetric(
            user_id=body.user_id,
            metric_type=m.metric_type,
            value=m.value,
            unit=m.unit,
            timestamp=ts,
            source=m.source,
        )
        db.add(record)
        stored += 1

    await audit_log(
        db,
        action="health_ingest",
        resource_type="health",
        metadata={"count": stored},
    )
    return {"ok": True, "stored": stored}


@router.post("/sync")
async def sync_health(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Trigger Garmin health data sync."""
    try:
        from app.integrations.garmin_client import GarminClient

        client = GarminClient(user_id, db)
        await client.sync()
        await audit_log(db, action="health_sync", resource_type="health")
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(type(exc).__name__)}


@router.get("/trends")
async def get_metric_trends(
    user_id: str = Query(default="default"),
    metric_type: str = Query(default="steps"),
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Time-series data for a specific metric_type over N days."""
    cutoff = datetime.now(UTC) - timedelta(days=days)

    stmt = (
        select(
            func.date(HealthMetric.timestamp).label("day"),
            func.sum(HealthMetric.value).label("total"),
            HealthMetric.unit,
        )
        .where(
            and_(
                HealthMetric.user_id == user_id,
                HealthMetric.metric_type == metric_type,
                HealthMetric.timestamp >= cutoff,
            )
        )
        .group_by(func.date(HealthMetric.timestamp), HealthMetric.unit)
        .order_by(func.date(HealthMetric.timestamp).asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "date": str(row.day),
            "value": round(float(row.total), 2),
            "unit": row.unit,
        }
        for row in rows
    ]


@router.get("/goals")
async def get_goal_progress(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return current goal settings and progress for today."""
    settings = get_settings()
    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=UTC)
    today_end = today_start + timedelta(days=1)

    stmt = (
        select(
            HealthMetric.metric_type,
            func.sum(HealthMetric.value).label("total"),
        )
        .where(
            and_(
                HealthMetric.user_id == user_id,
                HealthMetric.timestamp >= today_start,
                HealthMetric.timestamp < today_end,
                HealthMetric.metric_type.in_(["protein", "calories", "steps"]),
            )
        )
        .group_by(HealthMetric.metric_type)
    )
    result = await db.execute(stmt)
    rows = {row.metric_type: float(row.total) for row in result.all()}

    protein_target = settings.daily_protein_target_g
    calorie_target = settings.daily_calorie_limit
    steps_target = 10000

    current_protein = rows.get("protein", 0.0)
    current_calories = rows.get("calories", 0.0)
    current_steps = rows.get("steps", 0.0)

    return {
        "protein": {
            "target_g": protein_target,
            "current_g": round(current_protein, 1),
            "pct": round(current_protein / protein_target * 100, 1) if protein_target else 0,
            "remaining_g": round(max(protein_target - current_protein, 0), 1),
        },
        "calories": {
            "target": calorie_target,
            "current": round(current_calories, 1),
            "pct": round(current_calories / calorie_target * 100, 1) if calorie_target else 0,
            "remaining": round(max(calorie_target - current_calories, 0), 1),
        },
        "steps": {
            "target": steps_target,
            "current": round(current_steps, 1),
            "pct": round(current_steps / steps_target * 100, 1),
            "remaining": round(max(steps_target - current_steps, 0), 1),
        },
    }


@router.get("/macros")
async def get_macros(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Nutrition macro breakdown for today."""
    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=UTC)
    today_end = today_start + timedelta(days=1)

    macro_types = ["protein", "carbs", "fat", "fiber", "calories"]
    stmt = (
        select(
            HealthMetric.metric_type,
            func.sum(HealthMetric.value).label("total"),
        )
        .where(
            and_(
                HealthMetric.user_id == user_id,
                HealthMetric.timestamp >= today_start,
                HealthMetric.timestamp < today_end,
                HealthMetric.metric_type.in_(macro_types),
            )
        )
        .group_by(HealthMetric.metric_type)
    )
    result = await db.execute(stmt)
    totals = {row.metric_type: float(row.total) for row in result.all()}

    protein_g = round(totals.get("protein", 0.0), 1)
    carbs_g = round(totals.get("carbs", 0.0), 1)
    fat_g = round(totals.get("fat", 0.0), 1)
    fiber_g = round(totals.get("fiber", 0.0), 1)
    calories = round(totals.get("calories", 0.0), 1)

    total_macro_cals = protein_g * 4 + carbs_g * 4 + fat_g * 9
    if total_macro_cals > 0:
        protein_pct = round(protein_g * 4 / total_macro_cals * 100)
        carbs_pct = round(carbs_g * 4 / total_macro_cals * 100)
        fat_pct = round(fat_g * 9 / total_macro_cals * 100)
    else:
        protein_pct = 0
        carbs_pct = 0
        fat_pct = 0

    return {
        "date": date.today().isoformat(),
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "fat_g": fat_g,
        "fiber_g": fiber_g,
        "calories": calories,
        "protein_pct": protein_pct,
        "carbs_pct": carbs_pct,
        "fat_pct": fat_pct,
    }


@router.get("/weekly")
async def get_weekly_summary(
    user_id: str = Query(default="default"),
    weeks: int = Query(default=4, ge=1, le=52),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Weekly health summary with per-week aggregation of key metrics."""
    cutoff = datetime.now(UTC) - timedelta(weeks=weeks)
    key_metrics = ["steps", "calories", "protein", "sleep_hours"]

    stmt = (
        select(
            func.to_char(HealthMetric.timestamp, 'IYYY-"W"IW').label("week"),
            HealthMetric.metric_type,
            func.avg(HealthMetric.value).label("avg_value"),
        )
        .where(
            and_(
                HealthMetric.user_id == user_id,
                HealthMetric.timestamp >= cutoff,
                HealthMetric.metric_type.in_(key_metrics),
            )
        )
        .group_by(
            func.to_char(HealthMetric.timestamp, 'IYYY-"W"IW'),
            HealthMetric.metric_type,
        )
        .order_by(func.to_char(HealthMetric.timestamp, 'IYYY-"W"IW').asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    weeks_data: dict[str, dict[str, float]] = {}
    for row in rows:
        week_label = row.week
        if week_label not in weeks_data:
            weeks_data[week_label] = {}
        weeks_data[week_label][row.metric_type] = round(float(row.avg_value), 1)

    return [
        {
            "week": week_label,
            "avg_steps": metrics.get("steps", 0),
            "avg_calories": metrics.get("calories", 0),
            "avg_protein_g": metrics.get("protein", 0),
            "avg_sleep_hours": metrics.get("sleep_hours", 0),
        }
        for week_label, metrics in sorted(weeks_data.items())
    ]
