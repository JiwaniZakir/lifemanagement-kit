---
name: budget-guard
description: "Track LLM token spend, warn at 80/95/100% of daily/monthly budget"
metadata: { "openclaw": { "emoji": "💰", "events": ["message:sent"] } }
---
# Budget Guard
Estimates token cost, persists to data-api, enforces daily/monthly budget limits (80%/95%/100%).
