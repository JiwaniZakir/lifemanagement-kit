---
name: aegis_security
description: "PII awareness, credential safety, audit logging, and data protection"
---
# Aegis Security

PII awareness, credential safety, audit logging, and data protection. This skill defines mandatory rules for handling sensitive data across ALL agent interactions. It should be loaded as an always-active skill for every agent in the system.

**This skill is always active. Every agent must follow these rules at all times, regardless of which other skills are in use.**

## When to Use

This skill is ALWAYS active. It applies to every agent interaction, every API call, and every message delivered to the user. Specifically:

- Before including ANY data in a message to the user
- Before logging or storing ANY data
- When handling financial data (account numbers, balances, transactions)
- When handling health data (medical information, personal metrics)
- When handling communication data (email content, message bodies, contact details)
- When auditing system access or reviewing security logs
- When any other skill returns data that might contain PII

## API Reference

Base URL: `http://data-api:8000`
All endpoints require: `Authorization: Bearer $DATA_API_TOKEN`
No `/api/v1` prefix -- endpoints are at the root.

### GET /audit/log

Paginated audit log viewer. Returns a history of all API access and system actions.

Query parameters:
- `limit` (optional, default 50, max 200) -- number of entries
- `offset` (optional, default 0) -- pagination offset
- `action` (optional) -- filter by action type

```
web_fetch("http://data-api:8000/audit/log?limit=50", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /audit/verify

Verify the tamper-evident SHA-256 hash chain of the audit log.

```
web_fetch("http://data-api:8000/audit/verify?limit=500", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Query parameters:
- `limit` (optional, default 500, range 10-5000) -- how many entries to verify

Response shape:
```json
{"ok": true, "verified": 500}
```

Or if tampering is detected:
```json
{"ok": false, "broken_at_id": "uuid", "verified": 247}
```

### GET /budget/usage

LLM token usage, cost breakdown, and budget status.

```
web_fetch("http://data-api:8000/budget/usage", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

## Guidelines

### Mandatory PII Redaction Rules

These rules are non-negotiable. Violating them is a critical security incident.

**NEVER include in any message, log, or stored output:**

| Data Type | Example | Replacement |
|-----------|---------|-------------|
| Social Security Numbers | 123-45-6789 | [SSN REDACTED] |
| Credit/debit card numbers | 4111 1111 1111 1111 | [CARD REDACTED] |
| Bank account numbers | 123456789012 | [ACCOUNT REDACTED] |
| Routing numbers | 021000021 | [ROUTING REDACTED] |
| Raw API keys or tokens | sk-abc123... | [CREDENTIAL REDACTED] |
| Passwords or password hashes | $2b$12$... | [PASSWORD REDACTED] |
| Full email message bodies | (email content) | Summarize, do not quote raw text |
| WhatsApp message contents | (message text) | Summarize, do not quote raw text |
| Medical record numbers | MRN-123456 | [MEDICAL ID REDACTED] |
| Full physical addresses | 123 Main St, City, ST 12345 | Use city/state only |

**Masking rules:**
- Account numbers: show only last 4 digits: `****1234`
- Card numbers: show only last 4 digits: `****5678`
- Email addresses: acceptable to show in full (they are needed for context)
- Phone numbers: acceptable to show in full unless the user requests otherwise
- Names: acceptable to show in full (they are needed for context)

### Credential Safety

- NEVER include API keys, tokens, secrets, or passwords in any agent message.
- NEVER log credentials, even in debug or error contexts.
- If an integration error mentions a credential in the error message, redact it before reporting.
- When discussing API configuration, say "your Plaid credentials are configured" not "your Plaid key is sk-abc123."

### Audit Log Monitoring

When reviewing audit logs, watch for:

1. **Brute force attempts** -- Multiple `login_failed` events from the same IP in a short window.
   - Threshold: 5+ failures in 15 minutes from one IP.
   - Action: Alert the user immediately.

2. **Unusual access patterns** -- Data access at unusual hours or from unexpected IPs.
   - Note any access outside the user's typical patterns.

3. **Hash chain breaks** -- If `audit-chain/verify` returns `"ok": false`, this indicates possible tampering.
   - Action: Alert immediately. This is a critical security event.

4. **Failed sync operations** -- Repeated sync failures may indicate credential expiry.
   - Action: Suggest re-authenticating the affected integration.

### LLM Budget Monitoring

The system tracks LLM token usage against a monthly budget. Budget levels:

| Status | Threshold | Action |
|--------|-----------|--------|
| OK | < 80% | Normal operation |
| Warning | 80-95% | Mention in briefings, suggest reducing non-essential LLM calls |
| Critical | 95-100% | Alert immediately, prioritize essential operations only |
| Exceeded | > 100% | Alert immediately, operations may be blocked |

When reporting LLM usage, always show:
- Current spend vs monthly budget (percentage)
- Cost breakdown by operation type (briefing, content, analysis, etc.)
- Projected end-of-month spend at current rate

### Data Minimization

- Only fetch the data you need. Do not call all endpoints "just in case."
- When presenting data, show summaries rather than raw records.
- For financial data, show aggregates (total spending, category breakdowns) rather than individual transactions unless specifically asked.
- For health data, show daily summaries rather than individual data points.

### Error Handling

When an API call fails:
- NEVER expose internal error details, stack traces, or system paths to the user.
- Report the failure generically: "I was unable to fetch your financial data. The sync may need to be retried."
- Log the actual error server-side (the API handles this).
- If the error contains credentials or tokens in the message, do NOT relay it.

### Token Safety

- The `DATA_API_TOKEN` is a machine-to-machine Bearer token. Treat it as a secret.
- NEVER include `DATA_API_TOKEN` in any message, log, or stored output.
- If you receive a 401/403 response, the token may be wrong or missing. Do not expose the token in error messages.

## Examples

### Example 1: Audit Log Review

**User:** Show me recent security events.

**Agent behavior:**
1. Call `GET /audit/log?limit=20`.
2. Summarize findings, highlighting any failed auth attempts.

**Response:**
> Here is your security summary for the last 24 hours:
>
> - 3 successful logins (your usual IP: 192.168.1.xxx)
> - 1 failed login attempt from IP 45.33.xx.xx at 3:12 AM -- this is not your usual IP. Worth monitoring.
> - 12 sync operations completed successfully (finance, email, calendar, health)
> - No audit chain anomalies detected
>
> The failed login from an unfamiliar IP is the only item of note. If you see more of these, consider rotating your password.

### Example 2: Audit Chain Verification

**User:** Is the audit log intact?

**Agent behavior:**
1. Call `GET /audit/verify?limit=1000`.

**Response (if intact):**
> The audit chain is intact. I verified 1,000 entries and the SHA-256 hash chain is unbroken. No tampering detected.

**Response (if broken):**
> ALERT: The audit chain is broken at entry [ID REDACTED]. 247 entries verified successfully, but the chain breaks at entry 248. This could indicate tampering or a database inconsistency. I recommend investigating immediately.

### Example 3: Handling PII in Another Skill's Data

**Scenario:** The finance skill returns a transaction with a full account number in an error field.

**Agent behavior:**
1. Detect the account number pattern.
2. Redact before including in the response.

**Correct response:**
> Your Chase checking account (****4567) shows a balance of $4,250.00.

**WRONG response (never do this):**
> Your Chase checking account 123456784567 shows a balance of $4,250.00.

### Example 4: LLM Budget Check

**User:** How much am I spending on AI?

**Agent behavior:**
1. Call `GET /budget/usage`.

**Response:**
> Your LLM usage for the past 30 days:
>
> - Total spend: $47.20 / $100.00 budget (47%)
> - Status: OK
>
> Breakdown:
> - Content generation: $18.50 (39%)
> - Daily briefings: $12.30 (26%)
> - Meeting summaries: $8.40 (18%)
> - Ad-hoc queries: $8.00 (17%)
>
> At this rate, you will hit about $62 by end of month -- well within budget.

## Error Handling

- `401 Unauthorized` -- Bearer token missing or invalid
- `404 Not Found` -- Resource doesn't exist
- `422 Validation Error` -- Invalid request parameters
- `500 Internal Server Error` -- Integration failure; retry after sync
