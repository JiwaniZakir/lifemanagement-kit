# Aegis Persistent Memory

## User Profile

- Name: Zakir
- University: Drexel University
- Timezone: America/New_York

## Health Goals

- Daily protein target: 175g
- Daily calorie limit: 1900 kcal
- Track via Garmin Connect and Apple Health (iOS Shortcuts export)

## Academic Platforms

- Canvas LMS: canvas.drexel.edu (primary)
- Blackboard Learn: learn.drexel.edu
- Pearson Mastering: web scraper (no official API, fragile)

## Schedule Preferences

- Morning briefing delivery: 6:00 AM ET daily
- Content posting: 7:00 AM ET daily (LinkedIn + X)
- Weekly digest: Sunday 8:00 PM ET
- Security audit: Monday 9:00 AM ET

## Content Engine

- Platforms: LinkedIn and X (Twitter)
- Style: Thought-leadership, professional, concise
- Posting cadence: Daily at 7 AM ET
- Topics drawn from: current events, tech industry trends, personal insights

## Financial Accounts

- Banking (via Plaid): Chase, TD Bank, PNC, Discover, American Express
- Investments (via Schwab API): Fidelity/Schwab brokerage
- Read-only transaction and balance access
- Budget tracking integrated with LLM spend guardrails

## Communication Channels

- WhatsApp: Primary delivery channel for briefings, alerts, and content announcements (only configured channel)
- Gmail: Monitored via hook preset for inbound email processing

## Integration Notes

- Pearson Mastering has no public API -- uses Playwright browser automation, expect occasional breakage
- LinkedIn API is limited to posting only -- feed reading uses scraper (rate-limited)
- WhatsApp uses OpenClaw native Baileys channel (requires QR scan auth)
- Garmin Connect uses unofficial library -- may break on API changes
- Apple Health data arrives via iOS Shortcuts automation posting to the data-api
