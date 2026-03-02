"""Finance API — Plaid banking + Schwab investment endpoints."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.account import Account
from app.models.transaction import Transaction
from app.security.audit import audit_log

router = APIRouter(tags=["finance"])


# ---------------------------------------------------------------------------
# Query endpoints
# ---------------------------------------------------------------------------


@router.get("/balances")
async def get_balances(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get all account balances."""
    stmt = select(Account).where(Account.user_id == user_id)
    result = await db.execute(stmt)
    accounts = result.scalars().all()
    balances = [
        {
            "id": str(a.id),
            "institution": a.institution,
            "account_type": a.account_type,
            "account_name": a.account_name,
            "balance": float(a.balance),
            "currency": a.currency,
            "last_synced": a.last_synced.isoformat() if a.last_synced else None,
        }
        for a in accounts
    ]
    return {
        "balances": balances,
        "total": round(sum(b["balance"] for b in balances), 2),
    }


@router.get("/transactions")
async def get_transactions(
    user_id: str = Query(default="default"),
    days: int = Query(default=30, ge=1, le=365),
    category: str | None = Query(default=None),
    merchant: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Query transactions with filters."""
    cutoff = date.today() - timedelta(days=days)

    # Get user's accounts
    acct_result = await db.execute(select(Account.id).where(Account.user_id == user_id))
    account_ids = [row[0] for row in acct_result.all()]
    if not account_ids:
        return {"transactions": [], "count": 0}

    conditions = [
        Transaction.account_id.in_(account_ids),
        Transaction.transaction_date >= cutoff,
    ]
    if category:
        conditions.append(Transaction.category == category)
    if merchant:
        conditions.append(Transaction.merchant.ilike(f"%{merchant}%"))

    stmt = (
        select(Transaction).where(and_(*conditions)).order_by(Transaction.transaction_date.desc())
    )
    result = await db.execute(stmt)
    txns = result.scalars().all()

    transactions = [
        {
            "id": str(t.id),
            "amount": float(t.amount),
            "date": t.transaction_date.isoformat(),
            "category": t.category,
            "merchant": t.merchant,
            "is_recurring": t.is_recurring,
        }
        for t in txns
    ]
    return {
        "transactions": transactions,
        "count": len(transactions),
    }


@router.get("/recurring")
async def get_recurring(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get recurring transactions (detected patterns)."""
    from collections import defaultdict

    acct_result = await db.execute(select(Account.id).where(Account.user_id == user_id))
    account_ids = [row[0] for row in acct_result.all()]
    if not account_ids:
        return []

    cutoff = date.today() - timedelta(days=90)
    stmt = select(Transaction).where(
        and_(
            Transaction.account_id.in_(account_ids),
            Transaction.transaction_date >= cutoff,
            Transaction.is_recurring.is_(True),
        )
    )
    result = await db.execute(stmt)
    txns = result.scalars().all()

    merchant_txns: dict[str, list] = defaultdict(list)
    for t in txns:
        if t.merchant:
            merchant_txns[t.merchant].append(t)

    recurring = []
    for merch, group in merchant_txns.items():
        amounts = [float(t.amount) for t in group]
        recurring.append(
            {
                "merchant": merch,
                "amount": round(sum(amounts) / len(amounts), 2),
                "occurrences": len(group),
                "last_date": max(t.transaction_date for t in group).isoformat(),
            }
        )

    return recurring


# ---------------------------------------------------------------------------
# Plaid Link flow
# ---------------------------------------------------------------------------


class PlaidLinkRequest(BaseModel):
    user_id: str


class PlaidExchangeRequest(BaseModel):
    user_id: str
    public_token: str


@router.post("/link/create")
async def create_link_token(
    body: PlaidLinkRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a Plaid Link token for the frontend."""
    from app.integrations.plaid_client import PlaidClient

    client = PlaidClient(body.user_id, db)
    result = await client.create_link_token()
    return result


@router.post("/link/exchange")
async def exchange_public_token(
    body: PlaidExchangeRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Exchange a Plaid public token for an access token."""
    from app.integrations.plaid_client import PlaidClient

    client = PlaidClient(body.user_id, db)
    item_id = await client.exchange_public_token(body.public_token)
    return {"item_id": item_id}


# ---------------------------------------------------------------------------
# Sync trigger
# ---------------------------------------------------------------------------


@router.post("/sync")
async def sync_finance(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Trigger a full finance sync (Plaid transactions + balances)."""
    from app.integrations.plaid_client import PlaidClient

    try:
        client = PlaidClient(user_id, db)
        txns = await client.sync_transactions()
        balances = await client.get_balances()
        await audit_log(db, action="finance_sync", resource_type="finance")
        return {
            "ok": True,
            "transactions_added": len(txns),
            "accounts_updated": len(balances),
        }
    except Exception as exc:
        return {"ok": False, "error": str(type(exc).__name__)}


# ---------------------------------------------------------------------------
# Schwab
# ---------------------------------------------------------------------------


@router.get("/schwab/portfolio")
async def schwab_portfolio(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Fetch Schwab portfolio positions."""
    from app.integrations.schwab_client import SchwabClient

    client = SchwabClient(user_id, db)
    return await client.get_portfolio()


class SchwabTradeRequest(BaseModel):
    user_id: str
    symbol: str
    quantity: int
    order_type: str
    action: str
    limit_price: float | None = None


@router.post("/schwab/trade/preview")
async def schwab_trade_preview(
    body: SchwabTradeRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Preview a Schwab trade (step 1 of 2)."""
    from app.integrations.schwab_client import SchwabClient

    client = SchwabClient(body.user_id, db)
    return await client.place_trade(
        symbol=body.symbol,
        quantity=body.quantity,
        order_type=body.order_type,
        action=body.action,
        limit_price=body.limit_price,
    )


class SchwabConfirmRequest(BaseModel):
    user_id: str
    confirmation_token: str


@router.post("/schwab/trade/confirm")
async def schwab_trade_confirm(
    body: SchwabConfirmRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Confirm and execute a Schwab trade (step 2 of 2)."""
    from app.integrations.schwab_client import SchwabClient

    client = SchwabClient(body.user_id, db)
    return await client.confirm_trade(body.confirmation_token)


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------


@router.get("/subscriptions")
async def get_subscriptions(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get recurring transactions formatted as subscriptions."""
    from collections import defaultdict

    acct_result = await db.execute(select(Account.id).where(Account.user_id == user_id))
    account_ids = [row[0] for row in acct_result.all()]
    if not account_ids:
        return {"subscriptions": [], "total_monthly": 0.0}

    cutoff = date.today() - timedelta(days=90)
    stmt = select(Transaction).where(
        and_(
            Transaction.account_id.in_(account_ids),
            Transaction.transaction_date >= cutoff,
            Transaction.is_recurring.is_(True),
        )
    )
    result = await db.execute(stmt)
    txns = result.scalars().all()

    grouped: dict[tuple[str, float], list] = defaultdict(list)
    for t in txns:
        if t.merchant:
            key = (t.merchant, float(t.amount))
            grouped[key].append(t)

    subscriptions = []
    for (merchant_name, amount), group in grouped.items():
        last_date = max(t.transaction_date for t in group)
        categories = [t.category for t in group if t.category]
        subscriptions.append(
            {
                "merchant": merchant_name,
                "monthly_cost": abs(amount),
                "category": categories[0] if categories else None,
                "last_charge": last_date.isoformat(),
                "next_estimated": (last_date + timedelta(days=30)).isoformat(),
            }
        )

    total_monthly = round(sum(s["monthly_cost"] for s in subscriptions), 2)
    return {
        "subscriptions": subscriptions,
        "total_monthly": total_monthly,
    }


# ---------------------------------------------------------------------------
# Financial snapshot
# ---------------------------------------------------------------------------


@router.get("/snapshot")
async def get_snapshot(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Aggregated financial snapshot for the current month."""
    from sqlalchemy import func

    acct_result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = acct_result.scalars().all()

    total_balance = sum(float(a.balance) for a in accounts)
    accounts_count = len(accounts)

    account_ids = [a.id for a in accounts]
    if not account_ids:
        return {
            "total_balance": 0.0,
            "accounts_count": 0,
            "month_spending": 0.0,
            "month_income": 0.0,
            "monthly_subscriptions": 0.0,
            "net_this_month": 0.0,
        }

    today = date.today()
    month_start = today.replace(day=1)

    month_txn_result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.account_id.in_(account_ids),
                Transaction.transaction_date >= month_start,
            )
        )
    )
    month_txns = month_txn_result.scalars().all()

    month_spending = sum(float(t.amount) for t in month_txns if t.amount < 0)
    month_income = sum(float(t.amount) for t in month_txns if t.amount > 0)

    sub_result = await db.execute(
        select(func.coalesce(func.sum(func.abs(Transaction.amount)), 0)).where(
            and_(
                Transaction.account_id.in_(account_ids),
                Transaction.is_recurring.is_(True),
                Transaction.transaction_date >= month_start,
            )
        )
    )
    monthly_subscriptions = float(sub_result.scalar_one())

    return {
        "total_balance": round(total_balance, 2),
        "accounts_count": accounts_count,
        "month_spending": round(abs(month_spending), 2),
        "month_income": round(month_income, 2),
        "monthly_subscriptions": round(monthly_subscriptions, 2),
        "net_this_month": round(month_income + month_spending, 2),
    }


# ---------------------------------------------------------------------------
# Portfolio alias
# ---------------------------------------------------------------------------


@router.get("/portfolio")
async def get_portfolio(
    user_id: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Convenience alias for /schwab/portfolio."""
    return await schwab_portfolio(user_id=user_id, db=db)


# ---------------------------------------------------------------------------
# Affordability check
# ---------------------------------------------------------------------------


class AffordabilityRequest(BaseModel):
    user_id: str
    purchase_amount: float


@router.post("/affordability")
async def check_affordability(
    body: AffordabilityRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Evaluate whether a purchase is affordable based on financial data."""
    acct_result = await db.execute(select(Account).where(Account.user_id == body.user_id))
    accounts = acct_result.scalars().all()
    total_balance = sum(float(a.balance) for a in accounts)

    account_ids = [a.id for a in accounts]
    if not account_ids:
        return {
            "purchase_amount": body.purchase_amount,
            "total_balance": 0.0,
            "monthly_expenses": 0.0,
            "monthly_income": 0.0,
            "available_budget": 0.0,
            "months_runway": 0.0,
            "affordable": False,
            "verdict": "not_recommended",
            "recommendation": "No financial data available.",
        }

    cutoff_90d = date.today() - timedelta(days=90)
    txn_result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.account_id.in_(account_ids),
                Transaction.transaction_date >= cutoff_90d,
            )
        )
    )
    txns = txn_result.scalars().all()

    total_spending = sum(float(t.amount) for t in txns if t.amount < 0)
    total_income = sum(float(t.amount) for t in txns if t.amount > 0)

    monthly_spending_avg = round(abs(total_spending) / 3, 2)
    monthly_income_avg = round(total_income / 3, 2)

    balance_after = total_balance - body.purchase_amount
    monthly_net = monthly_income_avg - monthly_spending_avg

    if monthly_net > 0:
        months_runway = round(balance_after / monthly_net, 1) if balance_after > 0 else 0.0
    else:
        months_runway = (
            round(balance_after / monthly_spending_avg, 1) if monthly_spending_avg > 0 else 0.0
        )

    if months_runway >= 6:
        verdict = "comfortable"
        recommendation = "This purchase fits comfortably within your budget."
    elif months_runway >= 2:
        verdict = "tight"
        recommendation = "Affordable, but will reduce your financial cushion."
    else:
        verdict = "not_recommended"
        recommendation = "This purchase would leave you with less than 2 months of runway."

    available_budget = round(max(monthly_income_avg - monthly_spending_avg, 0), 2)

    return {
        "purchase_amount": body.purchase_amount,
        "total_balance": round(total_balance, 2),
        "monthly_expenses": monthly_spending_avg,
        "monthly_income": monthly_income_avg,
        "available_budget": available_budget,
        "months_runway": months_runway,
        "affordable": verdict in ("comfortable", "tight"),
        "verdict": verdict,
        "recommendation": recommendation,
    }
