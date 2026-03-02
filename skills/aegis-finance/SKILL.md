---
name: aegis_finance
description: "Banking, investment, and spending intelligence via Plaid and Schwab"
---
# Aegis Finance

Banking, investment, and spending intelligence via Plaid (banking) and Schwab (investments). Covers balances, transactions, recurring charges, subscriptions, affordability analysis, portfolio positions, and trading.

## When to Use

Activate when the user asks about: account balances, net worth, recent transactions, spending by category or merchant, recurring charges, subscriptions, month-over-month comparisons, unusual charges, investment portfolio, stock positions, whether they can afford a purchase, or Plaid account linking.

## API Reference

Base URL: `http://data-api:8000` -- All endpoints require `Authorization: Bearer $DATA_API_TOKEN`.
All endpoints are under `/finance`. No `/api/v1` prefix.

### GET /finance/balances

```
web_fetch("http://data-api:8000/finance/balances?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Returns: `{"balances": [{"account_id","name","type","current","available","currency"}], "total": 12500.00}`

### GET /finance/transactions

Query params: `user_id` (default), `days` (default 30), `category` (optional), `merchant` (optional).

```
web_fetch("http://data-api:8000/finance/transactions?user_id=default&days=30&category=Food", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Returns: `{"transactions": [{"amount","date","category","merchant"}], "count": 15}`

### GET /finance/recurring

Detected recurring charges across all accounts.

```
web_fetch("http://data-api:8000/finance/recurring?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /finance/subscriptions

Identified subscription services with monthly costs.

```
web_fetch("http://data-api:8000/finance/subscriptions?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Returns: `{"subscriptions": [{"merchant","average_amount","monthly_cost","occurrences","last_charge","flagged"}], "total_monthly": 187.50}`

### GET /finance/snapshot

Mobile-friendly overview: total balance + recent transactions.

```
web_fetch("http://data-api:8000/finance/snapshot?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /finance/portfolio

Combined portfolio from Plaid investment accounts.

```
web_fetch("http://data-api:8000/finance/portfolio?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### POST /finance/affordability

```
web_fetch("http://data-api:8000/finance/affordability", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN", "Content-Type": "application/json"},
  "body": "{\"purchase_amount\": 500.00, \"user_id\": \"default\"}"
})
```

Returns: `{"affordable": true, "monthly_income", "monthly_expenses", "available_budget", "recommendation"}`

### POST /finance/link/create and /finance/link/exchange

Plaid Link flow: create a link token, then exchange the public token after user completes Plaid Link.

```
web_fetch("http://data-api:8000/finance/link/create", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN", "Content-Type": "application/json"},
  "body": "{\"user_id\": \"default\"}"
})
```

```
web_fetch("http://data-api:8000/finance/link/exchange", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN", "Content-Type": "application/json"},
  "body": "{\"user_id\": \"default\", \"public_token\": \"public-sandbox-xxx\"}"
})
```

### POST /finance/sync

Trigger a full Plaid + Schwab sync.

```
web_fetch("http://data-api:8000/finance/sync?user_id=default", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /finance/schwab/portfolio

Schwab-specific portfolio positions.

```
web_fetch("http://data-api:8000/finance/schwab/portfolio?user_id=default", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### POST /finance/schwab/trade/preview and /finance/schwab/trade/confirm

Two-step trade execution: preview first, then confirm with the returned token.

```
web_fetch("http://data-api:8000/finance/schwab/trade/preview", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN", "Content-Type": "application/json"},
  "body": "{\"user_id\": \"default\", \"symbol\": \"VOO\", \"quantity\": 5, \"order_type\": \"MARKET\", \"action\": \"BUY\"}"
})
```

```
web_fetch("http://data-api:8000/finance/schwab/trade/confirm", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN", "Content-Type": "application/json"},
  "body": "{\"user_id\": \"default\", \"confirmation_token\": \"token-from-preview\"}"
})
```

## Guidelines

- Format currency as `$X,XXX.XX`. Group transactions by category when summarizing.
- Flag subscriptions where `flagged: true`. Show annual cost (`monthly_cost * 12`).
- For portfolio: report gain/loss as `(current_price - average_price) * quantity` in dollars and percent. NEVER provide investment advice.
- NEVER expose raw account numbers, routing numbers, or card numbers. The API masks these already -- double-check.
- Schwab trades require two steps (preview then confirm). ALWAYS show the preview to the user and get explicit approval before calling confirm.
- When data seems stale, call `POST /finance/sync` first, then re-fetch.
