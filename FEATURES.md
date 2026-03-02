# FEATURES.md — Aegis Feature Spec for OpenClaw Rebuild

Every feature from the current codebase, mapped to its new home.

**Legend**: `data-api` = custom Python endpoint | `skill` = OpenClaw SKILL.md | `hook` = OpenClaw hook | `openclaw` = native OpenClaw feature | `deleted` = not carried forward

---

## 1. Finance

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| Plaid Link token creation | `integrations/plaid_client.py` | `data-api /finance/link` | Server-side SDK, encrypted token storage |
| Plaid public token exchange | `integrations/plaid_client.py` | `data-api /finance/link` | Encrypted access token storage |
| Transaction sync (cursor-based) | `integrations/plaid_client.py` | `data-api /finance/sync` | Plaid Transactions Sync API |
| Balance retrieval | `integrations/plaid_client.py` | `data-api /finance/balances` | Updates stored account balances |
| Recurring transaction detection | `integrations/plaid_client.py` | `data-api /finance/recurring` | Merchant grouping + interval analysis |
| Transaction queries (date, category, merchant) | `api/v1/finance.py` | `data-api /finance/transactions` | SQL queries with filters |
| Schwab OAuth flow | `integrations/schwab_client.py` | `data-api /finance/schwab/auth` | State validation, token exchange |
| Schwab portfolio positions | `integrations/schwab_client.py` | `data-api /finance/schwab/portfolio` | Account balances, positions |
| Schwab trade preview + confirmation | `integrations/schwab_client.py` | `data-api /finance/schwab/trade` | Two-step confirmation pattern |
| Spending analysis | `services/finance_analyzer.py` | `skill aegis-finance` | LLM does the reasoning |
| Portfolio daily brief | `services/finance_analyzer.py` | `skill aegis-finance` | LLM composes from raw data |
| Anomaly detection | `services/finance_analyzer.py` | `skill aegis-finance` | LLM identifies anomalies |
| Budget recommendations | `services/finance_analyzer.py` | `skill aegis-finance` | LLM generates advice |

## 2. Calendar

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| Google Calendar OAuth token management | `integrations/google_calendar_client.py` | `data-api /calendar/sync` | Refresh token rotation |
| Event fetching (date range) | `integrations/google_calendar_client.py` | `data-api /calendar/events` | Google Calendar API v3 |
| Today's events | `integrations/google_calendar_client.py` | `data-api /calendar/today` | Convenience endpoint |
| Outlook/Graph events | `integrations/outlook_client.py` | `data-api /calendar/sync` | Azure AD OAuth |
| Conflict detection | `api/v1/calendar.py` | `skill aegis-calendar` | LLM identifies conflicts |
| Free slot finder | `api/v1/calendar.py` | `skill aegis-calendar` | LLM computes availability |

## 3. LMS (Academic)

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| Canvas course listing | `integrations/canvas_client.py` | `data-api /lms/courses` | Personal access token auth |
| Canvas assignment fetch + storage | `integrations/canvas_client.py` | `data-api /lms/sync` | Upsert by external_id |
| Canvas grades | `integrations/canvas_client.py` | `data-api /lms/grades` | Per-course submissions |
| Canvas announcements | `integrations/canvas_client.py` | `data-api /lms/announcements` | Per-course |
| Blackboard sync | `integrations/blackboard_client.py` | `data-api /lms/sync` | REST API + playwright fallback |
| Pearson scraping | `integrations/pearson_scraper.py` | `data-api /lms/sync` | Playwright browser automation |
| Upcoming assignments query | `api/v1/email.py` (combined) | `data-api /lms/due` | SQL query by due_date |
| Assignment tracking | `services/assignment_tracker.py` | `skill aegis-lms` | LLM prioritizes deadlines |
| Overdue detection | `services/assignment_tracker.py` | `skill aegis-lms` | LLM flags overdue |

## 4. Health & Fitness

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| Garmin Connect auth | `integrations/garmin_client.py` | `data-api /health/sync` | Unofficial garminconnect lib |
| Garmin stats/steps/HR/sleep/activities | `integrations/garmin_client.py` | `data-api /health/sync` | Multi-metric pull |
| Health metric storage | `integrations/garmin_client.py` | `data-api /health/ingest` | Also for iOS Shortcuts POST |
| Health metric queries | `api/v1/health.py` | `data-api /health/today`, `/health/summary` | SQL aggregation |
| Goal tracking (protein, calories) | `services/health_optimizer.py` | `skill aegis-health` | LLM checks progress vs targets |
| Wellness recommendations | `services/health_optimizer.py` | `skill aegis-health` | LLM generates advice |
| Apple Health ingestion | `api/v1/health.py` POST | `data-api /health/ingest` | iOS Shortcuts → API |

## 5. Social Media & Content

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| LinkedIn posting (official API) | `integrations/linkedin_client.py` | `data-api /social/post` | OAuth token management |
| X/Twitter posting (API v2) | `integrations/x_client.py` | `data-api /social/post` | tweepy, paid tier |
| LinkedIn feed scraping | `integrations/linkedin_client.py` | `deleted` | ToS risk, OpenClaw web_search replaces |
| X feed reading | `integrations/x_client.py` | `deleted` | OpenClaw web_search replaces |
| News aggregation | `integrations/news_aggregator.py` | `deleted` | OpenClaw web_search replaces |
| Post generation (RAG) | `services/content_engine.py` | `skill aegis-content` | LLM + web_search replaces RAG |
| Engagement analytics | `services/social_poster.py` | `skill aegis-content` | LLM analyzes via API data |
| Multi-platform scheduling | `services/social_poster.py` | `skill aegis-content` | Cron-driven via OpenClaw |

## 6. Email

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| Gmail sync | `integrations/gmail_client.py` | `openclaw` | Native Gmail hook preset |
| Email priority scoring | `services/email_analyzer.py` | `deleted` | LLM does this natively |
| Action extraction | `services/email_analyzer.py` | `deleted` | LLM does this natively |
| Thread summarization | `services/email_analyzer.py` | `deleted` | LLM does this natively |

## 7. Contacts

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| Contact graph (NetworkX) | `services/contact_graph.py` | `deleted` | Not high-value; LLM can reason about contacts |
| Engagement scoring | `services/contact_graph.py` | `deleted` | |
| Outreach suggestions | `services/contact_graph.py` | `deleted` | |

## 8. Productivity

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| Screen time analysis | `services/productivity_analyzer.py` | `deleted` | Low-priority; revisit later |
| Focus session tracking | `services/productivity_analyzer.py` | `deleted` | |
| App usage reporting | `api/v1/productivity.py` | `deleted` | |

## 9. WhatsApp

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| WhatsApp message send/receive | `integrations/whatsapp_bridge.py` | `openclaw` | Native Baileys channel |
| Message sync | `api/v1/whatsapp.py` | `deleted` | OpenClaw handles natively |
| WhatsApp bridge sidecar | `whatsapp-bridge/` | `deleted` | Replaced by OpenClaw native |

## 10. Voice

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| STT (Whisper/Deepgram) | `services/voice_service.py` | `deleted` | OpenClaw voice channel handles |
| Voice Q&A | `services/voice_service.py` | `deleted` | OpenClaw interactive agent |
| Session history | `services/voice_service.py` | `deleted` | OpenClaw memory handles |

## 11. Meeting Transcription

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| Whisper transcription | `services/meeting_transcriber.py` | `deleted` | Revisit as OpenClaw plugin |
| Meeting summarization | `services/meeting_transcriber.py` | `deleted` | |
| Action item extraction | `services/meeting_transcriber.py` | `deleted` | |

## 12. Briefing & Insights

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| Morning briefing aggregation | `services/daily_briefing.py` | `skill aegis-briefing` | Agent queries all endpoints |
| Weekly digest | `services/daily_briefing.py` | `skill aegis-briefing` | Agent queries all endpoints |
| Cross-domain insights | `api/v1/insights.py` | `skill aegis-briefing` | LLM synthesizes across data |

## 13. Security & Audit

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| AES-256-GCM field encryption | `security/encryption.py` | `data-api /security/encryption.py` | Transplant unchanged |
| Hash-chained audit log | `security/audit.py` | `data-api /security/audit.py` + `hook audit-logger` | Dual: DB + hook |
| Audit chain verification | `security/audit.py` | `data-api /audit/verify` | Endpoint |
| PII redaction (regex) | `security/pii_redact.py` | `hook pii-guard` | Port Python → TypeScript |
| LLM budget tracking | `services/llm_tracker.py` | `hook budget-guard` | Port Python → TypeScript |
| JWT auth + TOTP 2FA | `security/auth.py` | `deleted` | Not needed; M2M Bearer token only |
| Rate limiting (Redis) | `security/rate_limit.py` | `deleted` | Not needed; single caller |
| Dual-factor lockout | `security/monitoring.py` | `deleted` | Not needed; no user login |
| Token blocklist | `security/token_blocklist.py` | `deleted` | Not needed; no JWT |
| SSRF protection | `security/url_validator.py` | `deleted` | No web crawling in data-api |
| Credential CRUD | `api/v1/integrations.py` | `data-api /credentials/*` | Encrypted storage |

## 14. Frontend — Web Console

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| Dashboard | `console/src/app/page.tsx` | `openclaw` | OpenClaw Control UI at :18789 |
| Finance page | `console/src/app/finance/` | `openclaw` | Agent queries data-api |
| Security page | `console/src/app/security/` | `openclaw` | Agent queries audit endpoint |
| All other pages | `console/src/app/*/` | `openclaw` | Control UI replaces all |
| Login / auth | `console/src/app/login/` | `openclaw` | Built-in auth |

## 15. Frontend — Mobile App

| Feature | Current Location | New Home | Notes |
|---------|-----------------|----------|-------|
| Voice interface | `mobile/app/voice.tsx` | `openclaw` | WhatsApp voice messages |
| Dashboard | `mobile/app/index.tsx` | `deleted` | WhatsApp is the interface |
| Health data | `mobile/app/health.tsx` | `deleted` | iOS Shortcuts → data-api |
| Login | `mobile/app/login.tsx` | `deleted` | Not needed |

---

## Summary: What Stays Custom

| Component | Endpoints | Why |
|-----------|-----------|-----|
| Credential CRUD | 3 | AES-256-GCM encrypted storage in Postgres |
| Finance (Plaid + Schwab) | 8 | Server-side SDK, OAuth flows, encrypted tokens |
| Calendar (Google + Outlook) | 4 | OAuth refresh token management |
| LMS (Canvas + Blackboard + Pearson) | 5 | Authenticated API calls, browser automation |
| Health (Garmin + iOS ingest) | 4 | Unofficial lib, iOS Shortcuts endpoint |
| Social posting (LinkedIn + X) | 2 | Token management, API posting |
| Audit log | 2 | Hash-chain verification, query |
| Encryption + audit (security) | — | Transplanted from backend/ |

**Total: ~28 endpoints across 7 routers + 6 integration clients + 6 models**

## What's Deleted (replaced by OpenClaw native features)

- All 13 service files (business logic → agent skills)
- 10 of 16 integration clients (replaced by OpenClaw tools/channels)
- JWT auth, rate limiting, monitoring, token blocklist
- Redis, Qdrant, MinIO, Traefik (infrastructure services)
- Next.js console (→ OpenClaw Control UI)
- React Native mobile app (→ WhatsApp channel)
- WhatsApp bridge sidecar (→ OpenClaw native Baileys)
- Gmail integration (→ OpenClaw Gmail hook)
- News aggregation (→ OpenClaw web_search)
- Voice service (→ OpenClaw voice channel)
- Contact graph, productivity tracking, meeting transcription
