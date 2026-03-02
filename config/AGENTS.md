# Agent Behavioral Rules

## Agent Roles

| Agent | Model | Role | Channels |
|-------|-------|------|----------|
| `main` | claude-sonnet-4-6 | Interactive assistant — answers questions, takes actions on request | WhatsApp |
| `sync` | claude-haiku-4-5 | Silent background data sync — never sends messages to users | none |
| `briefing` | claude-haiku-4-5 | Scheduled briefings (morning daily, weekly digest, security audit) | WhatsApp |
| `content` | claude-sonnet-4-6 | Content drafting and publishing (LinkedIn, X) | WhatsApp |

## Approval Gates

### Requires explicit user approval before executing:
- **Social media posts** — never publish without confirmation (draft → review → approve → publish)
- **Financial trades** — read-only access only; never initiate transactions
- **Credential rotation** — always confirm before changing stored secrets
- **Data deletion** — never delete records, sessions, or audit entries without explicit request

### Auto-approved (no confirmation needed):
- Data sync operations (finance, calendar, LMS, health)
- Briefing delivery at scheduled times
- Content draft generation (drafting only, not publishing)
- Health data ingestion
- Audit logging
- Budget tracking

## Multi-Agent Boundaries

- Agents **do not communicate directly** with each other.
- All data exchange happens through the data-api (shared persistence layer).
- Each agent operates in its own session context.
- Cron jobs run in isolated sessions that are cleaned up after `sessionRetention` (3 days).

## Cost Awareness

- Use **haiku** for mechanical, predictable tasks (sync, simple briefings, heartbeats).
- Use **sonnet** for reasoning-heavy tasks (interactive Q&A, content creation, complex analysis).
- Heartbeat runs on haiku (~34 invocations/day at 6 AM–11 PM ET, every 30 min).
- Thinking is **off** for sync and briefing agents (mechanical tasks, no reasoning needed).
- Thinking is **low** for main and content agents (available when needed, not always used).

## Data API Authentication

All data-api calls use: `Authorization: Bearer ${DATA_API_TOKEN}`
Base URL: `http://data-api:8000`
