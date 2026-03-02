---
name: budget-guard
description: "Track LLM token spend, warn at 80/95/100% of daily/monthly budget"
metadata: { "openclaw": { "emoji": "💰", "events": ["message:sent"] } }
---
# Budget Guard

Estimates token cost for each outbound message, persists usage to data-api, and enforces daily/monthly budget limits.

## Default Budgets

- **Daily**: $5.00 (override via `LLM_DAILY_BUDGET_USD` env var)
- **Monthly**: $50.00 (override via `LLM_MONTHLY_BUDGET_USD` env var)

## Threshold Levels

| Level | Threshold | Behavior |
|-------|-----------|----------|
| OK | < 80% | Normal operation, no user notification |
| Warning | >= 80% | Pushes a warning message to the user suggesting reduced non-essential AI calls |
| Critical | >= 95% | Pushes an urgent warning; non-essential calls may be blocked soon |
| Exceeded | >= 100% | **Blocks the message** — clears `event.context.content` and notifies the user that AI calls are paused until the next budget period |

## Pricing

Token cost estimation uses these per-1M-token rates:

| Model | Input | Output |
|-------|-------|--------|
| claude-haiku-4-5 | $0.80 | $4.00 |
| claude-sonnet-4-6 | $3.00 | $15.00 |

Token estimation heuristic: 1 token ~ 4 characters.

## Persistence

- Usage records are POSTed to `data-api /budget/record` on every outbound message.
- Budget status is fetched from `data-api /budget/usage` to check thresholds.
- All state is stored in PostgreSQL via data-api — no local files. Survives container restarts and enables cross-session tracking.
- If data-api is unreachable, the hook defaults to "ok" status (fail-open for usability).
