<h1 align="center">
  🛡️ Aegis
</h1>

<p align="center">
  <strong>Your life, one AI away.</strong><br />
  Self-hosted AI agents that connect your finances, calendar, academics, health, and social media — then deliver actionable insights over WhatsApp.
</p>

<p align="center">
  <a href="https://github.com/JiwaniZakir/lifemanagement-kit/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/JiwaniZakir/lifemanagement-kit/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a>
  <a href="https://github.com/JiwaniZakir/lifemanagement-kit"><img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" /></a>
  <a href="https://github.com/openclaw/openclaw"><img src="https://img.shields.io/badge/Built_on-OpenClaw-FF6B35?style=for-the-badge" alt="OpenClaw" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" /></a>
</p>

<br />

<p align="center">
  <code>4 containers · ~2,700 LOC · zero public ports</code>
</p>

<br />

---

## Highlights

**🏦 Financial intelligence** — Spending trends, recurring charges, subscription detection, and portfolio monitoring via [Plaid](https://plaid.com/) + [Schwab](https://developer.schwab.com/). [→ Finance skill](skills/aegis-finance/SKILL.md)

**📅 Calendar + academics** — Assignment deadlines, grade monitoring, and overdue alerts from Canvas LMS and Blackboard. Calendar sync from Google + Outlook. [→ Calendar skill](skills/aegis-calendar/SKILL.md) · [→ LMS skill](skills/aegis-lms/SKILL.md)

**💪 Health optimization** — Steps, heart rate, sleep, calories, and protein tracking from Garmin Connect and Apple Health. [→ Health skill](skills/aegis-health/SKILL.md)

**✍️ Content engine** — AI-generated thought-leadership posts for LinkedIn and X, delivered for approval before publishing. [→ Content skill](skills/aegis-content/SKILL.md)

**📬 Morning briefings** — Daily summary of calendar, deadlines, finances, and health goals — delivered to WhatsApp at 6 AM. Weekly digest every Sunday. [→ Briefing skill](skills/aegis-briefing/SKILL.md)

**🔒 Security-first** — AES-256-GCM encryption, hash-chained audit log, PII redaction, LLM budget guardrails, zero public ports. [→ Security model](SECURITY.md)

---

## How it works

Aegis is a skill pack for [**OpenClaw**](https://github.com/openclaw/openclaw), the open-source personal AI assistant platform. OpenClaw runs the agents, handles scheduling, delivers messages over WhatsApp, and provides a web UI. Aegis teaches it how to manage your life.

```
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
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Cloudflare Tunnel (zero public ports)           │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**OpenClaw** = the brain. Agents, cron, LLM calls, WhatsApp (Baileys), web UI, memory.
**Data API** = the vault. Encrypted credentials, integration proxies, tamper-evident audit log.

---

## Quick start

> **Runtime:** Docker + Docker Compose v2.29+. **4 GB RAM**, **2 CPU cores** minimum.

### Option A: Docker (everything included)

```bash
git clone https://github.com/JiwaniZakir/lifemanagement-kit.git && cd lifemanagement-kit
./infrastructure/scripts/bootstrap.sh
```

Then add your Anthropic key:

```bash
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...
docker compose restart openclaw-gateway
open http://localhost:18789    # OpenClaw Control UI
```

Bootstrap auto-generates `DATA_API_TOKEN`, `ENCRYPTION_MASTER_KEY`, and `POSTGRES_PASSWORD`. You only need `ANTHROPIC_API_KEY`.

### Option B: npm (OpenClaw native + Docker for data layer)

```bash
npm install -g openclaw@latest
git clone https://github.com/JiwaniZakir/lifemanagement-kit.git && cd lifemanagement-kit
openclaw onboard
docker compose up -d data-api postgres cloudflared
openclaw
```

> **First time?** See the complete [Setup from Scratch](docs/SETUP_FROM_SCRATCH.md) guide.

---

## Integrations

All integrations are optional. Enable only the ones you need.

| Integration | What it does | Credentials |
|:--|:--|:--|
| **Plaid** | Bank accounts, transactions, spending | `PLAID_CLIENT_ID` + `PLAID_SECRET` |
| **Schwab** | Investment portfolios, positions | `SCHWAB_APP_KEY` + `SCHWAB_APP_SECRET` |
| **Canvas LMS** | Assignments, grades, deadlines | Personal access token |
| **Blackboard** | Assignments, grades | URL + username + password |
| **Google Calendar** | Events, free/busy | OAuth client credentials |
| **Outlook Calendar** | Events, free/busy | Azure app credentials |
| **Garmin Connect** | Steps, HR, sleep, calories | Garmin email + password |
| **Apple Health** | Any Health metric | iOS Shortcut → POST |
| **LinkedIn** | Post publishing | Access token |
| **X / Twitter** | Post publishing | API v2 keys + tokens |

Store credentials in `.env` or the encrypted credential store. See [`.env.example`](.env.example).

---

## Scheduled tasks

| Task | Schedule | Agent | Delivery |
|:--|:--|:--|:--|
| Financial sync | Every 6 hours | `sync` | Silent |
| Calendar sync | Every 15 min | `sync` | Silent |
| LMS sync | Every 30 min | `sync` | Silent |
| Health sync | Hourly | `sync` | Silent |
| Morning briefing | 6:00 AM ET | `briefing` | WhatsApp |
| Content drafts | 7:00 AM ET | `content` | WhatsApp |
| Weekly digest | Sun 8:00 PM ET | `briefing` | WhatsApp |
| Security audit | Mon 9:00 AM ET | `briefing` | WhatsApp |

Configured in [`config/cron/jobs.json`](config/cron/jobs.json).

---

## Security

| Layer | Implementation |
|:--|:--|
| **Network** | Zero public ports — Cloudflare Tunnel only |
| **Encryption** | AES-256-GCM with AAD for credentials and sensitive fields |
| **Auth** | Bearer token, constant-time comparison (`hmac.compare_digest`) |
| **Audit** | SHA-256 hash-chained tamper-evident log |
| **PII** | Hook scans outbound messages for SSNs, card numbers, account numbers |
| **Budget** | Daily + monthly LLM spend tracking with alerts at 80 / 95 / 100% |
| **Containers** | `cap_drop: [ALL]`, `no-new-privileges: true`, internal-only networks |
| **Secrets** | SOPS + age for encrypted secret files in version control |

Full threat model → [SECURITY.md](SECURITY.md)

---

## Customization

<details>
<summary><strong>Add a skill</strong></summary>

<br />

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

OpenClaw auto-discovers skills at startup.

</details>

<details>
<summary><strong>Add a hook</strong></summary>

<br />

Create `hooks/my-hook/HOOK.md` (YAML frontmatter) and `hooks/my-hook/handler.ts`. Hooks intercept events like `message:sent` to add behavior — redaction, logging, budget tracking. See existing hooks for examples.

</details>

<details>
<summary><strong>Add an integration</strong></summary>

<br />

1. Create a client in `data-api/app/integrations/` (extends `BaseIntegration`)
2. Add a router in `data-api/app/api/`
3. Create an Alembic migration
4. Write a skill in `skills/` to teach agents the new endpoints
5. Add tests

Step-by-step → [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

</details>

<details>
<summary><strong>Modify agents</strong></summary>

<br />

Edit `config/openclaw.json` to change models, tool permissions, cron schedules, or channel settings.

| Agent | Model | Purpose |
|:--|:--|:--|
| `main` | claude-sonnet-4-6 | Interactive assistant (WhatsApp) |
| `sync` | claude-haiku-4-5 | Silent background sync |
| `briefing` | claude-haiku-4-5 | Morning brief + weekly digest |
| `content` | claude-sonnet-4-6 | LinkedIn + X drafts |

</details>

---

## Project structure

<details>
<summary><strong>View directory layout</strong></summary>

<br />

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
│   ├── pii-guard/                  # PII redaction on outbound
│   └── budget-guard/               # LLM spend tracking + alerts
├── data-api/                       # Encrypted persistence (FastAPI)
│   ├── app/
│   │   ├── main.py                 # App + auth middleware
│   │   ├── security/               # AES-256-GCM + audit log
│   │   ├── models/                 # 9 SQLAlchemy models
│   │   ├── api/                    # 10 routers (31 endpoints)
│   │   └── integrations/           # 10 API clients
│   ├── alembic/                    # Database migrations
│   └── tests/                      # 113 tests
├── infrastructure/
│   ├── Dockerfile.data-api
│   └── scripts/                    # bootstrap, deploy, backup, restore
├── docs/                           # Comprehensive documentation
├── docker-compose.yml              # 4 services
└── Makefile                        # dev, test, lint, deploy shortcuts
```

</details>

---

## Development

```bash
make help          # Show all available commands
make dev           # Start all services
make test          # Run tests
make lint          # Ruff linter
make format        # Ruff formatter
make health        # Check all services
make logs          # Follow logs
make backup        # Encrypted database backup
make security      # Trivy vulnerability scan
```

---

## Documentation

| Document | Description |
|:--|:--|
| [**Setup from Scratch**](docs/SETUP_FROM_SCRATCH.md) | Complete guide from zero to running |
| [**OpenClaw Guide**](docs/OPENCLAW_GUIDE.md) | How OpenClaw works + how to add Aegis features to any installation |
| [**Deployment**](docs/DEPLOYMENT.md) | Production deployment checklist |
| [**Development**](docs/DEVELOPMENT.md) | Developer guide: adding integrations, skills, hooks |
| [**Troubleshooting**](docs/TROUBLESHOOTING.md) | Common issues and fixes |
| [**Security**](SECURITY.md) | Threat model, encryption, vulnerability reporting |
| [**Features**](FEATURES.md) | Complete feature map |
| [**Contributing**](.github/CONTRIBUTING.md) | How to contribute |

---

## Contributing

Contributions welcome. See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

```bash
make lint test    # before submitting a PR
```

---

## License

[MIT](LICENSE)
