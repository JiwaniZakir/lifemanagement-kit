# Aegis

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://python.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Self-hosted personal intelligence platform built on [OpenClaw](https://github.com/openclaw/openclaw). Aggregates 10+ data sources (banking, calendars, LMS, health, social) and surfaces insights through WhatsApp via AI agents.

## Quick Start

```bash
# 1. Clone
git clone https://github.com/JiwaniZakir/aegis.git && cd aegis

# 2. Bootstrap (generates secrets, starts services, runs migrations)
./infrastructure/scripts/bootstrap.sh

# 3. Add your Anthropic API key to .env, then restart the gateway
#    Edit .env → set ANTHROPIC_API_KEY=sk-ant-...
docker compose restart openclaw-gateway

# 4. Open Control UI → pair WhatsApp by scanning the QR code
open http://localhost:18789
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Single VPS (Docker Compose)                   │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  OpenClaw Gateway │  │   Data API   │  │    PostgreSQL    │   │
│  │ (agents, cron, UI │  │  (FastAPI +  │  │   + pgvector     │   │
│  │  WhatsApp)        │  │  encryption) │  │                  │   │
│  └──────────────────┘  └──────────────┘  └──────────────────┘   │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │             Cloudflare Tunnel (zero public ports)           │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**OpenClaw IS the application** — it handles agents, scheduling (cron), LLM calls, WhatsApp delivery (Baileys), and the web UI. The **data-api** is a thin encrypted persistence layer (~1,500 LOC) that OpenClaw agents call via `web_fetch`.

4 Docker services. Zero public ports. ~2,700 lines of custom code.

## Data Integrations

| Category | Sources | Method |
|----------|---------|--------|
| **Banking** | Chase, TD, PNC, Discover, Amex | Plaid API |
| **Investments** | Schwab | Schwab API (`schwab-py`) |
| **Education** | Canvas LMS, Blackboard | Canvas REST API |
| **Calendar** | Google Calendar, Outlook | Google Calendar API, Microsoft Graph |
| **Health** | Apple Health, Garmin | iOS Shortcuts + Garmin Connect |
| **Social** | LinkedIn, X/Twitter | Platform APIs |

## Features

- **Morning briefing** — Aggregated daily brief delivered to WhatsApp at 6 AM
- **Financial tracking** — Spending trends, recurring charges, affordability checks via Plaid + Schwab
- **Academic tracking** — Assignment deadlines, grade monitoring, overdue alerts via Canvas LMS
- **Health optimization** — Activity, sleep, and nutrition tracking from Apple Health + Garmin
- **Content engine** — AI-generated LinkedIn + X posts delivered for approval
- **Weekly digest** — End-of-week summary with trends and highlights
- **AES-256-GCM encryption** — All sensitive data encrypted at rest
- **Tamper-evident audit log** — SHA-256 hash-chained audit trail
- **PII redaction** — Automatic regex-based redaction before outbound messages
- **LLM budget guardrails** — Daily/monthly spend tracking with alerts at 80/95/100%

## Integration Setup

### Google Calendar (OAuth 2.0)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Google Calendar API**
3. Create OAuth 2.0 credentials (Desktop app type)
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`
5. Complete the OAuth flow and store the refresh token via `POST /credentials`

### Plaid (Banking)

1. Sign up at [Plaid Dashboard](https://dashboard.plaid.com/)
2. Get Sandbox credentials (free) or Development credentials
3. Add `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_ENV` to `.env`
4. Use the Plaid Link flow (`POST /finance/link/create` → exchange token)

### Canvas LMS

1. In Canvas, go to **Account > Settings > Approved Integrations**
2. Generate a **Personal Access Token**
3. Store the token: `POST /credentials` with `service_name=canvas_access_token`
4. Set `CANVAS_API_URL` in `.env` (e.g., `https://canvas.drexel.edu/api/v1`)

## Customizing Skills

Skills are Markdown files in `skills/` that teach agents how to query data. Each skill has:

- A YAML frontmatter (`name`, `description`)
- API endpoint documentation with example `web_fetch` calls
- Guidelines for formatting and presenting data

To add a new skill, create `skills/my-skill/SKILL.md` and reference the data-api endpoints. OpenClaw auto-discovers skills at startup.

## Security

- **Zero public ports** — all access through Cloudflare Tunnel
- **Bearer token auth** — constant-time comparison for machine-to-machine calls
- **AES-256-GCM** with AAD context for credentials and sensitive fields
- **SHA-256 hash-chained** tamper-evident audit log
- **PII guard hook** — regex-scans outbound messages for SSN, card numbers, etc.
- **Budget guard hook** — tracks LLM spend, warns at threshold
- **Docker hardening** — `cap_drop: [ALL]`, `no-new-privileges: true`, internal-only networks

## Development

```bash
# Run data-api tests (113 tests)
cd data-api && uv run pytest -q

# Lint + format
cd data-api && uv run ruff check app/ tests/
cd data-api && uv run ruff format app/ tests/

# Run full stack locally
docker compose up -d
```

## Scheduled Tasks (OpenClaw Cron)

| Task | Frequency | Delivery |
|------|-----------|----------|
| Financial sync | Every 6 hours | silent |
| Calendar sync | Every 15 min | silent |
| LMS sync | Every 30 min | silent |
| Health sync | Hourly | silent |
| Morning briefing | Daily 6:00 AM | WhatsApp |
| Content drafts | Daily 7:00 AM | WhatsApp |
| Weekly digest | Sunday 8:00 PM | WhatsApp |
| Security audit | Monday 9:00 AM | WhatsApp |

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines.

## License

MIT License. See [LICENSE](LICENSE) for details.
