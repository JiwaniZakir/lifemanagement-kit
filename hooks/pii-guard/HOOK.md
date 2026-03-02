---
name: pii-guard
description: "Regex-scan outbound messages, redact SSN/cards/accounts before delivery"
metadata: { "openclaw": { "emoji": "🔒", "events": ["message:sent"] } }
---
# PII Guard

Scans outbound messages for PII patterns and redacts sensitive data before delivery to channels.

## Patterns Scanned

- **SSN** — Social Security Numbers in `123-45-6789`, `123 45 6789`, and 9-digit formats. Replaced with `[SSN]`.
- **Credit/debit card numbers** — 16-digit card numbers (with or without separators). Replaced with `[CARD_NUMBER]`.
- **Bank account numbers** — 10-17 consecutive digits. Last 4 digits are preserved (e.g., `****1234`).

## Not Redacted

Per the Aegis security policy, the following are acceptable to display in full:

- **Email addresses** — needed for context in calendar events, contact references, etc.
- **Phone numbers** — acceptable to show unless the user requests otherwise.

## Behavior

- Fires on `message:sent` events only (outbound messages).
- **Mutates** `event.context.content` in place with the redacted text before the message is delivered.
- Patterns are applied in order from most specific to least specific to prevent double-replacement.
- Redaction counts are logged to stderr for container log visibility.
- Synchronous — runs inline before message delivery.
