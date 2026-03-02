"""Budget API — LLM usage tracking and budget enforcement."""

from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import extract, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.llm_usage import LLMUsage

router = APIRouter(tags=["budget"])

# Claude pricing per 1M tokens (input / output)
_PRICING: dict[str, tuple[float, float]] = {
    "claude-haiku-4-5": (0.80, 4.00),
    "claude-sonnet-4-6": (3.00, 15.00),
    "claude-opus-4-6": (15.00, 75.00),
}


def _estimate_cost(model: str, input_tokens: int, output_tokens: int) -> Decimal:
    """Estimate cost in USD for a given token count."""
    in_rate, out_rate = _PRICING.get(model, (3.00, 15.00))
    cost = (input_tokens * in_rate + output_tokens * out_rate) / 1_000_000
    return Decimal(str(round(cost, 6)))


class UsageRecord(BaseModel):
    model: str
    input_tokens: int
    output_tokens: int


@router.post("/record")
async def record_usage(
    body: UsageRecord,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Record LLM token usage (called by budget-guard hook)."""
    today = date.today()
    cost = _estimate_cost(body.model, body.input_tokens, body.output_tokens)

    # Upsert: increment tokens and cost for today + model
    stmt = (
        pg_insert(LLMUsage)
        .values(
            usage_date=today,
            model=body.model,
            input_tokens=body.input_tokens,
            output_tokens=body.output_tokens,
            cost_usd=cost,
        )
        .on_conflict_do_update(
            constraint="uq_date_model",
            set_={
                "input_tokens": LLMUsage.input_tokens + body.input_tokens,
                "output_tokens": LLMUsage.output_tokens + body.output_tokens,
                "cost_usd": LLMUsage.cost_usd + cost,
            },
        )
    )
    await db.execute(stmt)

    return {"ok": True, "cost_usd": float(cost)}


@router.get("/usage")
async def get_usage(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get current LLM spend vs budget limits."""
    settings = get_settings()
    today = date.today()
    now = datetime.now(UTC)

    # Daily spend
    daily_stmt = select(func.coalesce(func.sum(LLMUsage.cost_usd), 0)).where(
        LLMUsage.usage_date == today
    )
    daily_result = await db.execute(daily_stmt)
    daily_spend = float(daily_result.scalar_one())

    # Monthly spend
    monthly_stmt = select(func.coalesce(func.sum(LLMUsage.cost_usd), 0)).where(
        extract("year", LLMUsage.usage_date) == now.year,
        extract("month", LLMUsage.usage_date) == now.month,
    )
    monthly_result = await db.execute(monthly_stmt)
    monthly_spend = float(monthly_result.scalar_one())

    daily_limit = settings.llm_daily_budget_usd
    monthly_limit = settings.llm_monthly_budget_usd

    return {
        "daily": {
            "spend_usd": round(daily_spend, 4),
            "limit_usd": daily_limit,
            "pct": round(daily_spend / daily_limit * 100, 1) if daily_limit else 0,
        },
        "monthly": {
            "spend_usd": round(monthly_spend, 4),
            "limit_usd": monthly_limit,
            "pct": round(monthly_spend / monthly_limit * 100, 1) if monthly_limit else 0,
        },
        "alerts": _check_alerts(daily_spend, daily_limit, monthly_spend, monthly_limit),
    }


def _check_alerts(
    daily: float, daily_limit: float, monthly: float, monthly_limit: float
) -> list[str]:
    alerts = []
    if daily_limit and daily >= daily_limit:
        alerts.append("DAILY_BUDGET_EXCEEDED")
    elif daily_limit and daily >= daily_limit * 0.95:
        alerts.append("DAILY_95_PCT")
    elif daily_limit and daily >= daily_limit * 0.80:
        alerts.append("DAILY_80_PCT")

    if monthly_limit and monthly >= monthly_limit:
        alerts.append("MONTHLY_BUDGET_EXCEEDED")
    elif monthly_limit and monthly >= monthly_limit * 0.95:
        alerts.append("MONTHLY_95_PCT")
    elif monthly_limit and monthly >= monthly_limit * 0.80:
        alerts.append("MONTHLY_80_PCT")

    return alerts
