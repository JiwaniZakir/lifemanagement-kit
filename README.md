# 🛡️ Aegis — Personal Intelligence Platform

<p align="center">
  <strong>Your life, one AI away.</strong>
</p>

<p align="center">
  <a href="https://github.com/JiwaniZakir/lifemanagement-kit/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/JiwaniZakir/lifemanagement-kit/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI status" /></a>
  <a href="https://github.com/JiwaniZakir/lifemanagement-kit/releases"><img src="https://img.shields.io/github/v/release/JiwaniZakir/lifemanagement-kit?include_prereleases&style=for-the-badge" alt="GitHub release" /></a>
  <a href="https://github.com/JiwaniZakir/lifemanagement-kit"><img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" /></a>
  <a href="https://github.com/openclaw/openclaw"><img src="https://img.shields.io/badge/Built_on-OpenClaw-FF6B35?style=for-the-badge" alt="OpenClaw" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License" /></a>
</p>

**Aegis** is a _personal intelligence platform_ that runs on your own server. It connects your bank accounts, calendars, coursework, fitness trackers, and social media — then delivers actionable insights over WhatsApp. Morning briefings at 6 AM, spending alerts, deadline warnings, health goal tracking, and AI-generated LinkedIn/X posts — all from a single Docker Compose stack with zero public ports.

Built on [OpenClaw](https://github.com/openclaw/openclaw). 4 containers. ~2,700 lines of custom code. Everything encrypted at rest with AES-256-GCM.

[Getting Started](docs/SETUP_FROM_SCRATCH.md) · [OpenClaw Guide](docs/OPENCLAW_GUIDE.md) · [Deployment](docs/DEPLOYMENT.md) · [Development](docs/DEVELOPMENT.md) · [Troubleshooting](docs/TROUBLESHOOTING.md) · [Security](SECURITY.md) · [Features](FEATURES.md) · [Contributing](.github/CONTRIBUTING.md)

## Highlights

- **[Financial intelligence](skills/aegis-finance/SKILL.md)** — spending trends, recurring charges, subscription detection, affordability checks, and portfolio monitoring via Plaid + Schwab.
- **[Calendar + academics](skills/aegis-calendar/SKILL.md)** — assignment deadlines, grade monitoring, overdue alerts from Canvas LMS + Blackboard; event sync from Google Calendar + Outlook.
- **[Health optimization](skills/aegis-health/SKILL.md)** — steps, heart rate, sleep, calories, protein tracking from Garmin Connect + Apple Health with time-of-day meal planning.
- **[Content engine](skills/aegis-content/SKILL.md)** — AI-generated thought-leadership posts for LinkedIn and X with topic rotation, tone control, and approval workflow.
- **[Morning briefings](skills/aegis-briefing/SKILL.md)** — daily summary of calendar, deadlines, finances, and health goals delivered to WhatsApp at 6 AM. Weekly digest every Sunday.
- **[Security-first](SECURITY.md)** — AES-256-GCM encryption, SHA-256 hash-chained audit log, PII redaction hooks, LLM budget guardrails, zero public ports via Cloudflare Tunnel.
- **[8 scheduled jobs](config/cron/jobs.json)** — financial sync every 6h, calendar sync every 15m, LMS sync every 30m, health sync hourly, plus 4 user-facing deliveries.
- **[3 security hooks](hooks/)** — audit logging, PII redaction, and budget enforcement run on every message before delivery.

## Install (recommended)

Runtime: **Docker** + **Docker Compose v2.29+**. Minimum **4 GB RAM**, **2 CPU cores**.

```bash
git clone https://github.com/JiwaniZakir/lifemanagement-kit.git && cd lifemanagement-kit
./infrastructure/scripts/bootstrap.sh
```

Bootstrap clones OpenClaw, generates secrets (`DATA_API_TOKEN`, `ENCRYPTION_MASTER_KEY`, `POSTGRES_PASSWORD`), starts all 4 services, waits for healthy, and runs database migrations. You only need to add one thing:

```bash
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...
docker compose restart openclaw-gateway
open http://localhost:18789    # OpenClaw Control UI
```

## Quick start (TL;DR)

Full beginner guide (integrations, WhatsApp pairing, cron setup): [Setup from Scratch](docs/SETUP_FROM_SCRATCH.md)

### Option A: Docker (everything included)

```bash
git clone https://github.com/JiwaniZakir/lifemanagement-kit.git && cd lifemanagement-kit
./infrastructure/scripts/bootstrap.sh

# Add your Anthropic key, restart, and open the Control UI
# Edit .env → ANTHROPIC_API_KEY=sk-ant-...
docker compose restart openclaw-gateway
open http://localhost:18789
```

### Option B: npm (OpenClaw native + Docker for data layer)

```bash
npm install -g openclaw@latest
git clone https://github.com/JiwaniZakir/lifemanagement-kit.git && cd lifemanagement-kit
openclaw onboard
docker compose up -d data-api postgres cloudflared
openclaw
```

### Option C: From source (development)

```bash
git clone https://github.com/JiwaniZakir/lifemanagement-kit.git && cd lifemanagement-kit
cp .env.example .env
# Edit .env with your secrets and ANTHROPIC_API_KEY

# Start services
docker compose up -d

# Run migrations
docker compose exec data-api uv run alembic upgrade head

# Install dev dependencies
cd data-api && uv sync --dev

# Dev loop
make dev
```

Upgrading? Pull latest, rebuild images, and run migrations:

```bash
git pull
docker compose up -d --build
docker compose exec data-api uv run alembic upgrade head
```

## Everything we built so far

### Core platform

- [Data API](data-api/) — FastAPI encrypted persistence layer with 31 endpoints, 10 routers, 9 SQLAlchemy models, and Bearer token auth.
- [AES-256-GCM encryption](data-api/app/security/encryption.py) — field-level encryption with AAD context binding for all credentials and sensitive data.
- [SHA-256 hash-chained audit log](data-api/app/security/audit.py) — tamper-evident audit trail with chain verification endpoint.
- [LLM budget tracking](data-api/app/api/budget.py) — per-model token usage, cost breakdown, daily + monthly budgets with alerts.
- [Encrypted credential store](data-api/app/api/credentials.py) — CRUD for integration credentials, encrypted at rest, audit-logged on access.
- [Database migrations](data-api/alembic/) — Alembic-managed schema with pgvector, pgcrypto, and uuid-ossp extensions.

### Integrations (10 clients)

- [Plaid client](data-api/app/integrations/plaid_client.py) — bank accounts, transactions, balances, recurring charges, subscription detection, Plaid Link token exchange.
- [Schwab client](data-api/app/integrations/schwab_client.py) — investment portfolios, positions, two-step trade execution (preview → confirm with token).
- [Canvas LMS client](data-api/app/integrations/canvas_client.py) — courses, assignments, grades, announcements via Canvas REST API.
- [Blackboard client](data-api/app/integrations/blackboard_client.py) — courses, assignments, grades via Blackboard Learn API.
- [Google Calendar client](data-api/app/integrations/google_calendar_client.py) — events, free/busy via Google Calendar API v3.
- [Outlook Calendar client](data-api/app/integrations/outlook_calendar_client.py) — events, free/busy via Microsoft Graph API.
- [Garmin Connect client](data-api/app/integrations/garmin_client.py) — steps, heart rate, sleep, calories via `garminconnect` library.
- [LinkedIn client](data-api/app/integrations/linkedin_client.py) — post publishing via LinkedIn API.
- [X client](data-api/app/integrations/x_client.py) — post publishing, search, profile via X API v2.
- [Base integration](data-api/app/integrations/base.py) — abstract base class with encrypted credential access, sync, and health check.

### Skills (8 custom)

- [aegis-finance](skills/aegis-finance/SKILL.md) — banking, investments, spending queries, affordability checks, portfolio monitoring, subscription detection.
- [aegis-calendar](skills/aegis-calendar/SKILL.md) — today's events, multi-day lookups, free slot detection, back-to-back meeting warnings.
- [aegis-lms](skills/aegis-lms/SKILL.md) — assignments, grades, deadlines with priority levels (overdue → critical → high → medium → low).
- [aegis-health](skills/aegis-health/SKILL.md) — health metrics, goals tracking, macro breakdown, time-of-day meal suggestions.
- [aegis-social](skills/aegis-social/SKILL.md) — cross-platform posting (LinkedIn + X), engagement tracking, post history.
- [aegis-content](skills/aegis-content/SKILL.md) — content generation with topic rotation, tone control, draft management, approval workflow.
- [aegis-briefing](skills/aegis-briefing/SKILL.md) — morning briefing + weekly digest assembly from all data sources.
- [aegis-security](skills/aegis-security/SKILL.md) — PII redaction rules, audit chain verification, budget monitoring, incident detection.

### Hooks (3 custom + 2 bundled)

- [audit-logger](hooks/audit-logger/) — fire-and-forget POST to audit endpoint on every `command`, `message:sent`, and `message:received` event.
- [pii-guard](hooks/pii-guard/) — regex-scans outbound messages and redacts SSNs, card numbers, account numbers before delivery.
- [budget-guard](hooks/budget-guard/) — tracks LLM token spend per message, warns at 80/95%, blocks at 100% of daily/monthly budget.
- `session-memory` — bundled OpenClaw hook that saves session context on `/new`.
- `boot-md` — bundled OpenClaw hook that loads BOOT.md on gateway startup.

### Agents (4)

- `main` (claude-sonnet-4-6) — interactive WhatsApp assistant with web_fetch, web_search, and memory.
- `sync` (claude-haiku-4-5) — silent background sync agent, web_fetch only, runs all data sync cron jobs.
- `briefing` (claude-haiku-4-5) — morning briefing + weekly digest + security audit delivery agent.
- `content` (claude-sonnet-4-6) — LinkedIn + X content generation with web_search for research.

### Automation

- 8 cron jobs — financial sync (6h), calendar sync (15m), LMS sync (30m), health sync (hourly), morning briefing (6 AM), content drafts (7 AM), weekly digest (Sun 8 PM), security audit (Mon 9 AM).
- All cron runs in isolated sessions with 120–300s timeouts.

### Infrastructure

- [Docker Compose](docker-compose.yml) — 4 services: `openclaw-gateway`, `data-api`, `postgres` (pgvector), `cloudflared`.
- [Production overrides](docker-compose.prod.yml) — resource limits, read-only filesystem, configurable uvicorn workers.
- [Bootstrap script](infrastructure/scripts/bootstrap.sh) — one-command setup with secret generation, OpenClaw cloning, and .env validation.
- [Deploy script](infrastructure/scripts/deploy.sh) — build, start, health check, migration pipeline.
- [Backup script](infrastructure/scripts/backup.sh) — age-encrypted pg_dump with mandatory encryption.
- [Restore script](infrastructure/scripts/restore.sh) — decrypt, restore, and migrate with `--confirm` safety flag.
- [Cloudflare Tunnel](infrastructure/cloudflared/) — zero public ports, token-based auth.
- [CI pipeline](.github/workflows/ci.yml) — lint, TypeScript check, tests with PostgreSQL, Docker build validation, Trivy security scan.

## How it works

Aegis is a skill pack + encrypted data layer for [**OpenClaw**](https://github.com/openclaw/openclaw), the open-source personal AI assistant. OpenClaw provides the agent runtime, scheduling, WhatsApp delivery (Baileys), web UI, and memory. Aegis teaches it how to manage your finances, calendar, coursework, health, and social media through 8 custom skills that call a private FastAPI service.

```
WhatsApp / Web UI
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Single VPS (Docker Compose)                  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  OpenClaw Gateway │  │   Data API   │  │   PostgreSQL     │   │
│  │                   │  │  (FastAPI +   │  │   + pgvector     │   │
│  │  · 4 AI agents    │  │  encryption)  │  │                  │   │
│  │  · 8 skills       │  │              │  │  · credentials   │   │
│  │  · 3 hooks        │  │  · 31 endpoints│  │  · transactions  │   │
│  │  · 8 cron jobs    │  │  · 10 clients │  │  · audit log     │   │
│  │  · WhatsApp + UI  │  │  · 9 models   │  │  · health data   │   │
│  └──────────────────┘  └──────────────┘  └──────────────────┘   │
│           │                    │                    │            │
│           └────────────────────┼────────────────────┘            │
│                          internal networks                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Cloudflare Tunnel (zero public ports)           │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**OpenClaw** = the brain. Agents, cron scheduling, LLM calls, WhatsApp (Baileys), web UI, agent memory (LanceDB), session management.
**Data API** = the vault. Encrypted credential storage, integration API proxies, tamper-evident audit log, budget tracking. No analysis, no LLM calls, no delivery — just stores and retrieves.

## Key subsystems

- **[Encrypted persistence](data-api/app/security/encryption.py)** — AES-256-GCM field encryption with AAD context binding. Each credential is encrypted with a unique nonce and additional authenticated data (resource type + user ID).
- **[Audit chain](data-api/app/security/audit.py)** — every API call and agent event is logged to a SHA-256 hash-chained tamper-evident log in PostgreSQL. Chain integrity is verifiable via `GET /audit/verify`.
- **[Budget enforcement](hooks/budget-guard/)** — token-level LLM spend tracking with claude-haiku-4-5 ($0.80/$4.00 per 1M tokens) and claude-sonnet-4-6 ($3.00/$15.00 per 1M tokens). Warns at 80/95% of daily ($5) and monthly ($50) budgets; blocks at 100%.
- **[PII redaction](hooks/pii-guard/)** — regex hook intercepts all outbound messages and redacts SSNs, credit card numbers, and bank account numbers before delivery. Runs synchronously before WhatsApp send.
- **[Skill platform](skills/)** — 8 SKILL.md files with YAML frontmatter that teach OpenClaw agents how to call data-api endpoints via `web_fetch`. Skills replace Python service files — the LLM does the reasoning; skills teach data queries.
- **[Cron automation](config/cron/jobs.json)** — 8 scheduled jobs run in isolated sessions. Sync agents quietly update data; briefing agents deliver WhatsApp messages on schedule.

## Integrations

All integrations are optional. Enable only the ones you need.

### [Plaid](https://plaid.com/) (banking)

Connect bank accounts via Plaid Link. Aegis syncs transactions, detects recurring charges, identifies subscriptions, and tracks spending by category.

```bash
# Add credentials to .env
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENVIRONMENT=sandbox    # sandbox | development | production
```

Endpoints: `/finance/balances`, `/finance/transactions`, `/finance/recurring`, `/finance/subscriptions`, `/finance/snapshot`, `/finance/link/create`, `/finance/link/exchange`.

### [Schwab](https://developer.schwab.com/) (investments)

Monitor investment portfolios. Two-step trade execution: preview → confirm with approval token.

```bash
SCHWAB_APP_KEY=your_app_key
SCHWAB_APP_SECRET=your_app_secret
SCHWAB_CALLBACK_URL=https://127.0.0.1
```

Endpoints: `/finance/portfolio`, `/finance/schwab/portfolio`, `/finance/schwab/trade/preview`, `/finance/schwab/trade/confirm`.

### [Canvas LMS](https://www.instructure.com/canvas)

Track assignments, grades, and course announcements. Uses personal access tokens from Canvas settings.

```bash
# Store via encrypted credential store (recommended)
curl -X POST http://localhost:8000/credentials \
  -H "Authorization: Bearer $DATA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"default","service_name":"canvas_access_token","value":"YOUR_TOKEN"}'
```

Endpoints: `/lms/courses`, `/lms/due`, `/lms/grades`, `/lms/announcements`, `/lms/sync`.

### [Blackboard Learn](https://www.blackboard.com/)

Same assignment and grade tracking for Blackboard-based institutions.

```bash
BLACKBOARD_URL=https://your-institution.blackboard.com
BLACKBOARD_USERNAME=your_username
BLACKBOARD_PASSWORD=your_password
```

### [Google Calendar](https://console.cloud.google.com/)

Sync events and find free time slots. Requires a Google Cloud project with Calendar API v3 enabled.

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://127.0.0.1/callback
```

Endpoints: `/calendar/today`, `/calendar/events`, `/calendar/free`, `/calendar/sync`.

### [Outlook Calendar](https://portal.azure.com/) (Microsoft Graph)

Same event sync for Outlook/Microsoft 365 users. Requires an Azure AD app registration.

```bash
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_TENANT_ID=your_tenant_id
```

### [Garmin Connect](https://connect.garmin.com/)

Steps, heart rate, sleep stages, calories, and activity tracking via the unofficial `garminconnect` library.

```bash
GARMIN_EMAIL=your@email.com
GARMIN_PASSWORD=your_password
```

Endpoints: `/health/today`, `/health/summary`, `/health/trends`, `/health/goals`, `/health/macros`, `/health/weekly`, `/health/sync`.

### [Apple Health](https://www.apple.com/ios/health/) (via iOS Shortcuts)

Create an iOS Shortcut that exports Health data and POSTs it to the data-api ingest endpoint.

```bash
# iOS Shortcut → POST to:
http://your-server:8000/health/ingest

# Body: {"user_id": "default", "metric_type": "steps", "value": 8432, "source": "apple_health"}
```

Endpoint: `POST /health/ingest`.

### [LinkedIn](https://developer.linkedin.com/)

Post thought-leadership content. Requires an approved LinkedIn app with `w_member_social` scope.

```bash
LINKEDIN_ACCESS_TOKEN=your_access_token
```

### [X / Twitter](https://developer.x.com/)

Post content and search tweets. Requires API v2 keys (Basic tier: $100/mo for read + write).

```bash
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_SECRET=your_access_secret
```

Endpoints: `/social/post`, `/social/history`, `/social/engagement`, `/social/x/me`, `/social/x/search`.

## Scheduled tasks

| Task | Schedule | Agent | What it does |
|:--|:--|:--|:--|
| Financial sync | `0 */6 * * *` (every 6h) | `sync` | Pulls transactions + balances from Plaid and Schwab |
| Calendar sync | `*/15 * * * *` (every 15m) | `sync` | Syncs events from Google Calendar + Outlook |
| LMS sync | `*/30 * * * *` (every 30m) | `sync` | Fetches assignments + grades from Canvas + Blackboard |
| Health sync | `0 * * * *` (hourly) | `sync` | Pulls metrics from Garmin Connect |
| Morning briefing | `0 6 * * *` (6:00 AM ET) | `briefing` | Delivers daily summary to WhatsApp |
| Content drafts | `0 7 * * *` (7:00 AM ET) | `content` | Generates + sends LinkedIn/X post for approval |
| Weekly digest | `0 20 * * 0` (Sun 8 PM ET) | `briefing` | Delivers weekly summary to WhatsApp |
| Security audit | `0 9 * * 1` (Mon 9 AM ET) | `briefing` | Verifies audit chain + reports budget status |

All schedules are cron expressions in `config/cron/jobs.json`. Sync jobs run silently (only report errors); briefing/content jobs announce to WhatsApp.

## Agent configuration

Agents are defined in `config/openclaw.json`. Each agent has a model, tool permissions, and channel bindings.

| Agent | Model | Tools | Purpose |
|:--|:--|:--|:--|
| `main` | claude-sonnet-4-6 (haiku fallback) | web_fetch, web_search, memory_search | Interactive WhatsApp assistant |
| `sync` | claude-haiku-4-5 | web_fetch | Silent background data synchronization |
| `briefing` | claude-haiku-4-5 | web_fetch | Morning briefing + weekly digest delivery |
| `content` | claude-sonnet-4-6 (haiku fallback) | web_fetch, web_search | LinkedIn + X content generation |

Global defaults:

```json5
{
  agents: {
    defaults: {
      timezone: "America/New_York",
      timeFormat: "12h",
      timeout: 120,
      thinkingDefault: "low",
      compaction: {
        mode: "safeguard",
        reservedTokens: 4096,
        memoryFlush: { enabled: true },
      },
    },
  },
}
```

## Skills

Skills are SKILL.md files with YAML frontmatter that teach agents how to call data-api endpoints via `web_fetch`. OpenClaw auto-discovers skills at startup.

### [aegis-finance](skills/aegis-finance/SKILL.md)

Banking + investments. Queries balances, transactions, recurring charges, subscriptions. Runs affordability checks ("Can I afford this $200 purchase?"). Monitors Schwab portfolio positions. Masks all card/account numbers — shows only last 4 digits.

### [aegis-calendar](skills/aegis-calendar/SKILL.md)

Google Calendar + Outlook sync. Shows today's events sorted by start time. Detects free slots (30+ minute gaps). Warns about back-to-back meetings (< 15 min gap). Uses 12-hour format with relative time ("in 45 minutes", "tomorrow morning").

### [aegis-lms](skills/aegis-lms/SKILL.md)

Canvas + Blackboard coursework. Tracks assignments with priority levels: Overdue > Critical (< 24h) > High (< 48h) > Medium (< 7d) > Low. Always mentions overdue work first, even when not asked. Compares recent grades to course averages.

### [aegis-health](skills/aegis-health/SKILL.md)

Garmin + Apple Health metrics. Always shows actuals vs goals: "112g / 175g protein (64%) — 63g more needed". Suggests high-protein foods when behind. Time-of-day context: morning → plan lunch; afternoon → estimate dinner needs; evening → summarize day. Never provides medical advice.

### [aegis-social](skills/aegis-social/SKILL.md)

LinkedIn + X posting. Platform-native formatting: LinkedIn (500–2000 chars, professional, 3–5 hashtags); X (280 chars max, punchy, 1–3 hashtags). Never cross-posts identical text — rewrites for each platform. 5 posts/hour rate limit.

### [aegis-content](skills/aegis-content/SKILL.md)

Content generation engine. Topic rotation for auto mode: AI/SWE, productivity, building in public, tech leadership, startup culture, data-driven decisions, dev tools. Three tones: professional, casual, thought_leader. Never auto-publishes — requires user approval.

### [aegis-briefing](skills/aegis-briefing/SKILL.md)

Morning briefing (6 AM): greeting + schedule + urgent deadlines + financial snapshot + health check + top 3 action items. Weekly digest (Sunday 8 PM): schedule recap + academic progress + financial summary + health trends + next week preview. WhatsApp compatible: < 2000 chars per message.

### [aegis-security](skills/aegis-security/SKILL.md)

Always active across all agents. Mandatory redactions: SSN → `[SSN REDACTED]`, Card → `[CARD REDACTED]`, Account → `****1234`. Monitors for brute force patterns (5+ failures in 15 min). Hash-chain break detection = critical security alert. Budget thresholds: OK (< 80%), Warning (80–95%), Critical (95–100%), Exceeded (> 100%).

## Hooks

Hooks intercept agent events and run custom logic before delivery. Discovered via `HOOK.md` files with YAML frontmatter. Handlers are TypeScript files using the `InternalHookEvent` type.

### [audit-logger](hooks/audit-logger/)

Events: `command`, `message:sent`, `message:received`.

Fire-and-forget POST to `/audit/log` for every agent event. Non-blocking — HTTP POST never delays the event pipeline. Serializes as AuditPayload (action, resource type, session key, detail ≤ 500 chars, channel, timestamp). Silently drops events if data-api is unreachable.

### [pii-guard](hooks/pii-guard/)

Events: `message:sent`.

Regex-scans outbound messages before delivery:
- SSN (`123-45-6789`, `123 45 6789`, 9 consecutive digits) → `[SSN]`
- Credit/debit cards (16 digits, any separators) → `[CARD_NUMBER]`
- Bank account numbers (10–17 consecutive digits) → `****1234` (preserves last 4)

Email addresses and phone numbers are NOT redacted (needed for context). Patterns applied most-specific-to-least-specific to prevent double-replacement. Runs synchronously — inline before WhatsApp delivery.

### [budget-guard](hooks/budget-guard/)

Events: `message:sent`.

Tracks LLM token spend per message and enforces budgets:
- **OK** (< 80%) — normal operation
- **Warning** (80–95%) — pushes warning; suggests reducing non-essential calls
- **Critical** (95–100%) — urgent warning; non-essential calls may block soon
- **Exceeded** (≥ 100%) — blocks message, clears content, pauses AI calls

Default budgets: $5/day, $50/month (configurable via `LLM_DAILY_BUDGET_USD` and `LLM_MONTHLY_BUDGET_USD`). Token estimation: 1 token ≈ 4 characters. All state in PostgreSQL (survives container restarts). Fails open if data-api is unreachable.

## Security model

Aegis treats security as the #1 architectural constraint. Zero public ports. Everything encrypted. Every action audited.

### Network

- Zero public ports — all external access via Cloudflare Tunnel with token-based auth.
- Three Docker networks: `frontend`, `backend` (internal), `data` (internal).
- All containers: `cap_drop: [ALL]`, `no-new-privileges: true`.
- Production: `read_only: true` filesystem on data-api with tmpfs for `/tmp`.

### Encryption

- **Credentials at rest**: AES-256-GCM with per-field nonce and AAD context binding (resource type + user ID).
- **In transit**: Cloudflare Tunnel (TLS) for external; internal Docker networks for service-to-service.
- **Secrets management**: SOPS + age for encrypted secret files in version control.
- **Database**: PostgreSQL with pgcrypto extension available for additional encryption.

### Auth

Simple Bearer token (`DATA_API_TOKEN`) — no JWT, no sessions, no TOTP. Single machine-to-machine caller (OpenClaw → data-api). Constant-time comparison via `hmac.compare_digest()`.

### Audit

SHA-256 hash-chained tamper-evident log in PostgreSQL. Every entry includes the hash of the previous entry, creating an immutable chain. Chain integrity verifiable via `GET /audit/verify`. Any break in the chain indicates tampering.

### PII protection

- pii-guard hook runs on every outbound message before delivery
- SSNs, card numbers, and bank account numbers are automatically redacted
- aegis-security skill enforces redaction rules at the agent level
- Credentials are never logged — structlog uses secret-redacting processors

### Budget guardrails

- Per-model token pricing tracked at the message level
- Daily ($5) and monthly ($50) budgets with warnings at 80/95%
- Agent messages blocked at 100% of budget
- All usage data persisted in PostgreSQL (survives restarts)

Full threat model → [SECURITY.md](SECURITY.md)

## Configuration

### OpenClaw config

Edit `config/openclaw.json` to change agents, models, channels, hooks, or skill limits:

```json5
{
  agents: {
    defaults: {
      timezone: "America/New_York",
      thinkingDefault: "low",
    },
    list: [
      { id: "main", model: { primary: "anthropic/claude-sonnet-4-6" } },
      { id: "sync", model: "anthropic/claude-haiku-4-5" },
    ],
  },
  channels: {
    whatsapp: {
      enabled: true,
      dmPolicy: "pairing",
      phone: "${WHATSAPP_PHONE}",
    },
  },
}
```

### Add a skill

Create `skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: "What this skill teaches the agent"
---

# My Skill

Instructions for the agent. Document the endpoints, request/response
shapes, and when the agent should use this skill.
```

OpenClaw auto-discovers skills at startup. Skill files are capped at 65 KB; max 12 skills loaded per prompt (16,000 char limit).

### Add a hook

Create `hooks/my-hook/HOOK.md` and `hooks/my-hook/handler.ts`:

```yaml
---
name: my-hook
description: "What this hook does"
events:
  - message:sent
---
```

```typescript
export default async function handler(event: InternalHookEvent) {
  // event.type, event.action, event.sessionKey, event.context, event.timestamp
  // event.messages.push("line") to send messages to user
  // event.context.content = "new" to mutate content before delivery
}
```

### Add an integration

1. Create a client in `data-api/app/integrations/` (extend `BaseIntegration`)
2. Add a router in `data-api/app/api/`
3. Create an Alembic migration (`cd data-api && uv run alembic revision --autogenerate -m "Add new table"`)
4. Write a skill in `skills/` to teach agents the new endpoints
5. Add tests

Step-by-step → [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Project structure

```
lifemanagement-kit/
├── config/                         # OpenClaw configuration
│   ├── openclaw.json               # Agents, channels, cron, hooks
│   ├── cron/jobs.json              # 8 scheduled jobs
│   ├── BOOT.md                     # Agent orientation (loaded on startup)
│   ├── USER.md                     # User profile and preferences
│   └── MEMORY.md                   # Persistent agent memory
├── skills/                         # 8 custom skill definitions
│   ├── aegis-finance/SKILL.md
│   ├── aegis-calendar/SKILL.md
│   ├── aegis-lms/SKILL.md
│   ├── aegis-health/SKILL.md
│   ├── aegis-social/SKILL.md
│   ├── aegis-content/SKILL.md
│   ├── aegis-briefing/SKILL.md
│   └── aegis-security/SKILL.md
├── hooks/                          # 3 custom hooks (TypeScript)
│   ├── audit-logger/               # Hash-chained audit logging
│   │   ├── HOOK.md
│   │   └── handler.ts
│   ├── pii-guard/                  # PII redaction on outbound
│   │   ├── HOOK.md
│   │   └── handler.ts
│   └── budget-guard/               # LLM spend tracking + alerts
│       ├── HOOK.md
│       └── handler.ts
├── data-api/                       # Encrypted persistence (FastAPI)
│   ├── pyproject.toml              # uv-managed deps (~15 packages)
│   ├── alembic.ini
│   ├── alembic/                    # Database migrations
│   │   ├── env.py
│   │   └── versions/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, Bearer auth, audit middleware
│   │   ├── config.py               # Pydantic Settings
│   │   ├── database.py             # Async SQLAlchemy engine + sessions
│   │   ├── logging.py              # structlog with secret redaction
│   │   ├── security/
│   │   │   ├── encryption.py       # AES-256-GCM field encryption
│   │   │   └── audit.py            # SHA-256 hash-chained audit log
│   │   ├── models/                 # 9 SQLAlchemy models
│   │   │   ├── base.py             # DeclarativeBase, UUIDMixin, TimestampMixin
│   │   │   ├── credential.py
│   │   │   ├── audit.py
│   │   │   ├── account.py
│   │   │   ├── transaction.py
│   │   │   ├── assignment.py
│   │   │   ├── health_metric.py
│   │   │   ├── content_draft.py
│   │   │   └── social_post.py
│   │   ├── api/                    # 10 routers (31 endpoints)
│   │   │   ├── credentials.py
│   │   │   ├── finance.py
│   │   │   ├── calendar.py
│   │   │   ├── lms.py
│   │   │   ├── health.py
│   │   │   ├── social.py
│   │   │   ├── audit.py
│   │   │   ├── budget.py
│   │   │   ├── briefing.py
│   │   │   └── content.py
│   │   └── integrations/           # 10 API clients
│   │       ├── base.py
│   │       ├── plaid_client.py
│   │       ├── schwab_client.py
│   │       ├── canvas_client.py
│   │       ├── blackboard_client.py
│   │       ├── garmin_client.py
│   │       ├── google_calendar_client.py
│   │       ├── outlook_calendar_client.py
│   │       ├── linkedin_client.py
│   │       └── x_client.py
│   └── tests/                      # 113 tests
│       ├── conftest.py
│       ├── test_health_endpoint.py
│       ├── test_auth.py
│       ├── test_encryption.py
│       ├── test_audit.py
│       └── ...
├── infrastructure/
│   ├── Dockerfile.data-api         # Multi-stage Python 3.12-slim
│   ├── cloudflared/config.yml      # Tunnel config
│   ├── postgres/init.sql           # Extensions (vector, pgcrypto, uuid)
│   └── scripts/
│       ├── bootstrap.sh            # One-command setup
│       ├── deploy.sh               # Build + start + health
│       ├── backup.sh               # age-encrypted pg_dump
│       └── restore.sh              # Decrypt + restore + migrate
├── docs/
│   ├── SETUP_FROM_SCRATCH.md       # Complete zero-to-running guide
│   ├── OPENCLAW_GUIDE.md           # How OpenClaw works
│   ├── DEPLOYMENT.md               # Production checklist
│   ├── DEVELOPMENT.md              # Developer guide
│   └── TROUBLESHOOTING.md          # Common issues
├── docker-compose.yml              # 4 services
├── docker-compose.prod.yml         # Production overrides
├── docker-compose.override.yml     # Dev port bindings
├── .env.example                    # Environment template
├── Makefile                        # dev, test, lint, deploy shortcuts
├── SECURITY.md                     # Threat model
├── FEATURES.md                     # Feature map
├── CLAUDE.md                       # AI-assisted development reference
└── LICENSE                         # MIT
```

## Development

```bash
make help          # Show all available commands
make dev           # Start all services (dev mode with localhost ports)
make test          # Run 113 tests
make lint          # Ruff linter
make format        # Ruff formatter
make health        # Check all services
make logs          # Follow logs
make backup        # age-encrypted database backup
make restore       # Restore from encrypted backup
make build         # Build Docker images
make security      # Trivy vulnerability scan
```

Dev loop (data-api changes without Docker rebuild):

```bash
cd data-api
uv sync --dev
uv run pytest -v           # Run tests
uv run ruff check app/     # Lint
uv run ruff format app/    # Format
uv run alembic upgrade head # Apply migrations
```

## Docs

Use these when you're past the quick start and want the deeper reference.

### Getting started

- [Setup from Scratch](docs/SETUP_FROM_SCRATCH.md) — complete guide from zero to running, including VPS provisioning, Docker install, and integration setup.
- [OpenClaw Guide](docs/OPENCLAW_GUIDE.md) — how OpenClaw works and how to add Aegis features to any OpenClaw installation.

### Deployment + operations

- [Deployment](docs/DEPLOYMENT.md) — production deployment checklist: resource limits, backup schedule, monitoring, Cloudflare Tunnel setup.
- [Troubleshooting](docs/TROUBLESHOOTING.md) — common issues and fixes organized by category (Docker, database, integrations, WhatsApp, cron).

### Development

- [Development](docs/DEVELOPMENT.md) — developer guide: adding integrations, skills, hooks, and tests. Includes the BaseIntegration pattern and Alembic workflow.
- [CLAUDE.md](CLAUDE.md) — AI-assisted development reference with architecture, coding conventions, and critical rules.
- [Features](FEATURES.md) — complete feature map showing what each component provides.

### Security

- [Security](SECURITY.md) — full threat model, encryption details, PII handling, audit chain, vulnerability reporting.
- [Contributing](.github/CONTRIBUTING.md) — contribution guidelines, PR checklist, and code review process.

## Operations

### Backup + restore

```bash
# Create encrypted backup (requires age)
make backup

# Restore from encrypted backup
make restore
# or: ./infrastructure/scripts/restore.sh backups/aegis-2026-03-01.sql.gz.age --confirm
```

### Health checks

```bash
# Check all services
make health

# Or manually:
curl -sf http://localhost:8000/health        # data-api
docker compose exec postgres pg_isready      # PostgreSQL
```

### Secret rotation

```bash
# Rotate DATA_API_TOKEN, ENCRYPTION_MASTER_KEY every 90 days
./infrastructure/scripts/rotate-secrets.sh
```

### Monitoring

```bash
# Follow all logs
make logs

# Data-api only
docker compose logs -f data-api

# Check cron execution
docker compose logs openclaw-gateway | grep cron

# Verify audit chain integrity
curl -sf http://localhost:8000/audit/verify \
  -H "Authorization: Bearer $DATA_API_TOKEN"
```

## Contributing

Contributions welcome. See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines.

```bash
# Before submitting a PR
make lint test
```

## License

[MIT](LICENSE)
