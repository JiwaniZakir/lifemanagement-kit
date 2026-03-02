/**
 * Audit Logger Hook — POST events to data-api audit endpoint for hash-chain logging.
 *
 * Events: command, message:sent, message:received
 * Target: http://data-api:8000/audit/log (internal Docker network)
 * Auth: Bearer token from DATA_API_TOKEN env var
 *
 * Fire-and-forget — never blocks the event pipeline on the HTTP response.
 *
 * Uses official InternalHookEvent shape from OpenClaw.
 */

// ---------------------------------------------------------------------------
// Types — official InternalHookEvent shape
// ---------------------------------------------------------------------------

interface InternalHookEvent {
  type: "command" | "message" | "agent" | "gateway" | "session";
  action: string; // "new" | "sent" | "received" | "bootstrap" | "startup" etc.
  sessionKey: string;
  context: Record<string, unknown>;
  timestamp: Date;
  messages: string[];
}

interface AuditPayload {
  action: string;
  resource_type: "openclaw";
  resource_id: string;
  detail: string;
  metadata: {
    channel: string;
    timestamp: string;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUDIT_ENDPOINT = "http://data-api:8000/audit/log";
const MAX_DETAIL_LENGTH = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToken(): string {
  const token = process.env.DATA_API_TOKEN;
  if (!token) {
    console.error("[audit-logger] DATA_API_TOKEN not set — audit events will fail");
    return "";
  }
  return token;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function shouldHandle(event: InternalHookEvent): boolean {
  if (event.type === "command") return true;
  if (event.type === "message" && (event.action === "sent" || event.action === "received")) {
    return true;
  }
  return false;
}

function buildPayload(event: InternalHookEvent): AuditPayload {
  const content = (event.context.content as string) ?? "";
  const channel =
    (event.context.channelId as string) ??
    (event.context.commandSource as string) ??
    "unknown";

  const action =
    event.type === "command" ? "command" : `message:${event.action}`;

  return {
    action,
    resource_type: "openclaw",
    resource_id: event.sessionKey,
    detail: truncate(content, MAX_DETAIL_LENGTH),
    metadata: {
      channel,
      timestamp: event.timestamp.toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(event: InternalHookEvent): Promise<void> {
  if (!shouldHandle(event)) return;

  const token = getToken();
  if (!token) return;

  const payload = buildPayload(event);

  // Fire-and-forget: we deliberately do not await the response in the
  // critical path.  Errors are logged to stderr but never propagated.
  fetch(AUDIT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (!res.ok) {
        console.error(
          `[audit-logger] Audit endpoint returned HTTP ${res.status} for ${payload.action}`
        );
      }
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[audit-logger] Failed to POST audit event: ${message}`);
    });
}
