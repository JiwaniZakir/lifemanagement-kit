"""Briefing API — cross-domain data aggregation for daily/weekly briefings."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import structlog
from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.account import Account
from app.models.assignment import Assignment
from app.models.health_metric import HealthMetric
from app.models.llm_usage import LLMUsage
from app.models.transaction import Transaction
from app.security.audit import audit_log

logger = structlog.get_logger()

router = APIRouter(tags=["briefing"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _finance_today(db: AsyncSession, user_id: str, today: date) -> dict:
    """Aggregate today's financial snapshot."""
    # Total balance across all accounts
    acct_result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = acct_result.scalars().all()
    total_balance = sum(float(a.balance) for a in accounts)

    account_ids = [a.id for a in accounts]
    if not account_ids:
        return {"total_balance": 0.0, "today_transactions": 0, "today_spending": 0.0}

    # Today's transactions
    txn_result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.account_id.in_(account_ids),
                Transaction.transaction_date == today,
            )
        )
    )
    txns = txn_result.scalars().all()
    today_spending = sum(abs(float(t.amount)) for t in txns if t.amount < 0)

    return {
        "total_balance": round(total_balance, 2),
        "today_transactions": len(txns),
        "today_spending": round(today_spending, 2),
    }


async def _academics_today(db: AsyncSession, user_id: str, today: date) -> dict:
    """Count assignments due today, tomorrow, and overdue."""
    tomorrow = today + timedelta(days=1)
    today_start = datetime.combine(today, datetime.min.time(), tzinfo=UTC)
    today_end = datetime.combine(tomorrow, datetime.min.time(), tzinfo=UTC)
    tomorrow_end = datetime.combine(tomorrow + timedelta(days=1), datetime.min.time(), tzinfo=UTC)

    # Due today
    due_today_result = await db.execute(
        select(func.count())
        .select_from(Assignment)
        .where(
            and_(
                Assignment.user_id == user_id,
                Assignment.status != "completed",
                Assignment.due_date.isnot(None),
                Assignment.due_date >= today_start,
                Assignment.due_date < today_end,
            )
        )
    )
    due_today = due_today_result.scalar_one()

    # Due tomorrow
    due_tomorrow_result = await db.execute(
        select(func.count())
        .select_from(Assignment)
        .where(
            and_(
                Assignment.user_id == user_id,
                Assignment.status != "completed",
                Assignment.due_date.isnot(None),
                Assignment.due_date >= today_end,
                Assignment.due_date < tomorrow_end,
            )
        )
    )
    due_tomorrow = due_tomorrow_result.scalar_one()

    # Overdue
    overdue_result = await db.execute(
        select(func.count())
        .select_from(Assignment)
        .where(
            and_(
                Assignment.user_id == user_id,
                Assignment.status != "completed",
                Assignment.due_date.isnot(None),
                Assignment.due_date < today_start,
            )
        )
    )
    overdue = overdue_result.scalar_one()

    return {
        "due_today": due_today,
        "due_tomorrow": due_tomorrow,
        "overdue": overdue,
    }


async def _health_today(db: AsyncSession, user_id: str, today: date) -> dict:
    """Aggregate today's key health metrics."""
    today_start = datetime.combine(today, datetime.min.time(), tzinfo=UTC)
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
                HealthMetric.metric_type.in_(["steps", "calories", "protein"]),
            )
        )
        .group_by(HealthMetric.metric_type)
    )
    result = await db.execute(stmt)
    rows = {row.metric_type: float(row.total) for row in result.all()}

    return {
        "steps": round(rows.get("steps", 0)),
        "calories": round(rows.get("calories", 0)),
        "protein_g": round(rows.get("protein", 0)),
    }


async def _budget_today(db: AsyncSession, today: date) -> dict:
    """Get today's LLM budget usage."""
    from app.config import get_settings

    settings = get_settings()
    daily_stmt = select(func.coalesce(func.sum(LLMUsage.cost_usd), 0)).where(
        LLMUsage.usage_date == today
    )
    daily_result = await db.execute(daily_stmt)
    daily_spend = float(daily_result.scalar_one())

    return {
        "daily_spend_usd": round(daily_spend, 4),
        "daily_limit_usd": settings.llm_daily_budget_usd,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/today")
async def get_today_briefing(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Aggregate today's briefing data across all domains."""
    today = date.today()

    finance = await _finance_today(db, user_id, today)
    academics = await _academics_today(db, user_id, today)
    health = await _health_today(db, user_id, today)
    budget = await _budget_today(db, today)

    await audit_log(
        db,
        action="briefing_today",
        resource_type="briefing",
    )

    return {
        "date": today.isoformat(),
        "finance": finance,
        "academics": academics,
        "health": health,
        "budget": budget,
    }


@router.get("/weekly")
async def get_weekly_digest(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Aggregate the past 7 days for the weekly digest."""
    from app.config import get_settings

    settings = get_settings()
    today = date.today()
    week_start = today - timedelta(days=7)
    week_start_dt = datetime.combine(week_start, datetime.min.time(), tzinfo=UTC)
    today_end_dt = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=UTC)

    # --- Finance: total spent + top categories ---
    acct_result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = acct_result.scalars().all()
    account_ids = [a.id for a in accounts]

    total_spent = 0.0
    top_categories: list[dict] = []

    if account_ids:
        txn_result = await db.execute(
            select(Transaction).where(
                and_(
                    Transaction.account_id.in_(account_ids),
                    Transaction.transaction_date >= week_start,
                    Transaction.transaction_date <= today,
                )
            )
        )
        txns = txn_result.scalars().all()
        total_spent = sum(abs(float(t.amount)) for t in txns if t.amount < 0)

        # Top categories
        cat_totals: dict[str, float] = {}
        for t in txns:
            if t.amount < 0 and t.category:
                cat_totals[t.category] = cat_totals.get(t.category, 0) + abs(float(t.amount))
        top_categories = sorted(
            [{"name": k, "total": round(v, 2)} for k, v in cat_totals.items()],
            key=lambda x: x["total"],
            reverse=True,
        )[:5]

    # --- Academics ---
    completed_result = await db.execute(
        select(func.count())
        .select_from(Assignment)
        .where(
            and_(
                Assignment.user_id == user_id,
                Assignment.status == "completed",
                Assignment.updated_at >= week_start_dt,
            )
        )
    )
    completed = completed_result.scalar_one()

    submitted_result = await db.execute(
        select(func.count())
        .select_from(Assignment)
        .where(
            and_(
                Assignment.user_id == user_id,
                Assignment.status == "submitted",
                Assignment.updated_at >= week_start_dt,
            )
        )
    )
    submitted = submitted_result.scalar_one()

    upcoming_result = await db.execute(
        select(func.count())
        .select_from(Assignment)
        .where(
            and_(
                Assignment.user_id == user_id,
                Assignment.status != "completed",
                Assignment.due_date.isnot(None),
                Assignment.due_date >= datetime.combine(today, datetime.min.time(), tzinfo=UTC),
                Assignment.due_date
                < datetime.combine(today + timedelta(days=7), datetime.min.time(), tzinfo=UTC),
            )
        )
    )
    upcoming = upcoming_result.scalar_one()

    # --- Health averages ---
    health_stmt = (
        select(
            HealthMetric.metric_type,
            func.avg(HealthMetric.value).label("avg_val"),
        )
        .where(
            and_(
                HealthMetric.user_id == user_id,
                HealthMetric.timestamp >= week_start_dt,
                HealthMetric.timestamp < today_end_dt,
                HealthMetric.metric_type.in_(["steps", "sleep_hours", "protein"]),
            )
        )
        .group_by(HealthMetric.metric_type)
    )
    health_result = await db.execute(health_stmt)
    health_avgs = {row.metric_type: float(row.avg_val) for row in health_result.all()}

    # --- LLM budget for the week ---
    budget_stmt = select(func.coalesce(func.sum(LLMUsage.cost_usd), 0)).where(
        and_(
            LLMUsage.usage_date >= week_start,
            LLMUsage.usage_date <= today,
        )
    )
    budget_result = await db.execute(budget_stmt)
    week_spend = float(budget_result.scalar_one())

    await audit_log(
        db,
        action="briefing_weekly",
        resource_type="briefing",
    )

    return {
        "period": {
            "start": week_start.isoformat(),
            "end": today.isoformat(),
        },
        "finance": {
            "total_spent": round(total_spent, 2),
            "top_categories": top_categories,
        },
        "academics": {
            "completed": completed,
            "submitted": submitted,
            "upcoming": upcoming,
        },
        "health": {
            "avg_steps": round(health_avgs.get("steps", 0), 1),
            "avg_sleep_hours": round(health_avgs.get("sleep_hours", 0), 1),
            "avg_protein_g": round(health_avgs.get("protein", 0), 1),
        },
        "budget": {
            "week_spend_usd": round(week_spend, 4),
            "weekly_limit_usd": round(settings.llm_daily_budget_usd * 7, 2),
        },
    }


@router.get("/insights")
async def get_insights(
    user_id: str = Query(default="default"),
    days: int = Query(default=30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Cross-domain insights: spending, health, academic trends."""
    today = date.today()
    period_start = today - timedelta(days=days)
    prev_period_start = period_start - timedelta(days=days)
    period_start_dt = datetime.combine(period_start, datetime.min.time(), tzinfo=UTC)
    prev_period_start_dt = datetime.combine(prev_period_start, datetime.min.time(), tzinfo=UTC)
    today_end_dt = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=UTC)

    # --- Spending trend ---
    acct_result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = acct_result.scalars().all()
    account_ids = [a.id for a in accounts]

    current_spending = 0.0
    prev_spending = 0.0

    if account_ids:
        # Current period
        cur_txn_result = await db.execute(
            select(func.coalesce(func.sum(func.abs(Transaction.amount)), 0)).where(
                and_(
                    Transaction.account_id.in_(account_ids),
                    Transaction.transaction_date >= period_start,
                    Transaction.transaction_date <= today,
                    Transaction.amount < 0,
                )
            )
        )
        current_spending = float(cur_txn_result.scalar_one())

        # Previous period
        prev_txn_result = await db.execute(
            select(func.coalesce(func.sum(func.abs(Transaction.amount)), 0)).where(
                and_(
                    Transaction.account_id.in_(account_ids),
                    Transaction.transaction_date >= prev_period_start,
                    Transaction.transaction_date < period_start,
                    Transaction.amount < 0,
                )
            )
        )
        prev_spending = float(prev_txn_result.scalar_one())

    if prev_spending > 0:
        spending_change_pct = round((current_spending - prev_spending) / prev_spending * 100, 1)
        if spending_change_pct > 5:  # noqa: PLR2004
            spending_trend = "up"
        elif spending_change_pct < -5:  # noqa: PLR2004
            spending_trend = "down"
        else:
            spending_trend = "stable"
    else:
        spending_change_pct = 0.0
        spending_trend = "stable"

    # --- Health trends (steps + sleep) ---
    health_trends = {}
    for metric in ("steps", "sleep_hours"):
        cur_health = await db.execute(
            select(func.avg(HealthMetric.value)).where(
                and_(
                    HealthMetric.user_id == user_id,
                    HealthMetric.metric_type == metric,
                    HealthMetric.timestamp >= period_start_dt,
                    HealthMetric.timestamp < today_end_dt,
                )
            )
        )
        cur_avg = cur_health.scalar_one()

        prev_health = await db.execute(
            select(func.avg(HealthMetric.value)).where(
                and_(
                    HealthMetric.user_id == user_id,
                    HealthMetric.metric_type == metric,
                    HealthMetric.timestamp >= prev_period_start_dt,
                    HealthMetric.timestamp < period_start_dt,
                )
            )
        )
        prev_avg = prev_health.scalar_one()

        cur_val = float(cur_avg) if cur_avg else 0.0
        prev_val = float(prev_avg) if prev_avg else 0.0

        if prev_val > 0:
            change = round((cur_val - prev_val) / prev_val * 100, 1)
            if change > 5:  # noqa: PLR2004
                trend = "improving"
            elif change < -5:  # noqa: PLR2004
                trend = "declining"
            else:
                trend = "stable"
        else:
            change = 0.0
            trend = "stable"

        health_trends[metric] = {
            "current_avg": round(cur_val, 1),
            "previous_avg": round(prev_val, 1),
            "change_pct": change,
            "trend": trend,
        }

    # --- Academic load ---
    upcoming_result = await db.execute(
        select(func.count())
        .select_from(Assignment)
        .where(
            and_(
                Assignment.user_id == user_id,
                Assignment.status != "completed",
                Assignment.due_date.isnot(None),
                Assignment.due_date >= datetime.combine(today, datetime.min.time(), tzinfo=UTC),
                Assignment.due_date
                < datetime.combine(today + timedelta(days=7), datetime.min.time(), tzinfo=UTC),
            )
        )
    )
    upcoming_7d = upcoming_result.scalar_one()

    # --- Budget consumption rate ---
    from app.config import get_settings

    settings = get_settings()
    budget_stmt = select(func.coalesce(func.sum(LLMUsage.cost_usd), 0)).where(
        and_(
            LLMUsage.usage_date >= period_start,
            LLMUsage.usage_date <= today,
        )
    )
    budget_result = await db.execute(budget_stmt)
    period_spend = float(budget_result.scalar_one())
    daily_avg_spend = round(period_spend / max(days, 1), 4)

    await audit_log(
        db,
        action="briefing_insights",
        resource_type="briefing",
        metadata={"days": days},
    )

    return {
        "period_days": days,
        "spending": {
            "current_period": round(current_spending, 2),
            "previous_period": round(prev_spending, 2),
            "change_pct": spending_change_pct,
            "trend": spending_trend,
        },
        "health": health_trends,
        "academics": {
            "due_next_7_days": upcoming_7d,
        },
        "budget": {
            "period_spend_usd": round(period_spend, 4),
            "daily_avg_usd": daily_avg_spend,
            "daily_limit_usd": settings.llm_daily_budget_usd,
            "on_track": daily_avg_spend <= settings.llm_daily_budget_usd,
        },
    }
