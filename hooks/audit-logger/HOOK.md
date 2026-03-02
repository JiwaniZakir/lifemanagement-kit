---
name: audit-logger
description: "POST events to data-api audit endpoint for hash-chain logging"
metadata: { "openclaw": { "emoji": "📋", "events": ["command", "message:sent", "message:received"] } }
---
# Audit Logger

Fire-and-forget POST to data-api `/audit/log` for tamper-evident SHA-256 hash-chain audit logging.

## Event Types

- `command` — any agent command execution
- `message:sent` — outbound messages to the user or channels
- `message:received` — inbound messages from the user

## Behavior

- **Fire-and-forget**: The HTTP POST to data-api is non-blocking. The hook never delays or blocks the event pipeline waiting for a response.
- **Payload**: Each event is serialized as an `AuditPayload` with action, resource type, session key, truncated detail (max 500 chars), channel, and timestamp.
- **Auth**: Uses `DATA_API_TOKEN` environment variable for Bearer token authentication.

## Failure Mode

- If data-api is unreachable or returns an error, the event is **silently dropped** with a stderr log line.
- Audit events are best-effort. A data-api outage does not prevent message delivery or agent operation.
- Network errors and non-2xx responses are logged to stderr but never propagated to the user or agent.
