/**
 * PII Guard Hook — regex-scan outbound messages, redact SSN/cards/accounts
 * before delivery.
 *
 * Events: message:sent
 *
 * Patterns are applied in order from most specific to least specific to
 * prevent double-replacement (e.g. an SSN being partially matched by the
 * account-number pattern).
 *
 * Per security policy, emails and phone numbers are NOT redacted — they are
 * acceptable to show in full (see aegis-security skill). Only SSNs, credit
 * card numbers, and bank account numbers are redacted.
 *
 * Mutates event.context.content in place with redacted text.
 * Redaction counts are logged to stderr so they are visible in container logs.
 *
 * Uses official InternalHookEvent shape from OpenClaw.
 */

// ---------------------------------------------------------------------------
// Types — official InternalHookEvent shape
// ---------------------------------------------------------------------------

interface InternalHookEvent {
  type: "command" | "message" | "agent" | "gateway" | "session";
  action: string;
  sessionKey: string;
  context: Record<string, unknown>;
  timestamp: Date;
  messages: string[];
}

interface PiiPattern {
  label: string;
  pattern: RegExp;
  replacement: string | ((match: string) => string);
}

// ---------------------------------------------------------------------------
// PII Patterns — ordered from most to least specific
// ---------------------------------------------------------------------------

const PII_PATTERNS: PiiPattern[] = [
  // Social Security Numbers (US): 123-45-6789, 123 45 6789
  {
    label: "SSN",
    pattern: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g,
    replacement: "[SSN]",
  },

  // SSN without dashes — 9 consecutive digits (first group 001-899 excl 666)
  {
    label: "SSN",
    pattern: /\b(?!000|666|9\d\d)\d{3}(?!00)\d{2}(?!0000)\d{4}\b/g,
    replacement: "[SSN]",
  },

  // Credit / debit card numbers: 4 groups of 4 digits
  {
    label: "CARD_NUMBER",
    pattern: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
    replacement: "[CARD_NUMBER]",
  },

  // Bank routing/account numbers: 10-17 consecutive digits — preserve last 4
  {
    label: "ACCOUNT_NUMBER",
    pattern: /\b(\d{10,17})\b/g,
    replacement: (match: string) => `****${match.slice(-4)}`,
  },
];

// ---------------------------------------------------------------------------
// Redaction engine
// ---------------------------------------------------------------------------

interface RedactionResult {
  text: string;
  counts: Record<string, number>;
  totalRedactions: number;
}

function redact(text: string): RedactionResult {
  let redacted = text;
  const counts: Record<string, number> = {};
  let totalRedactions = 0;

  for (const { label, pattern, replacement } of PII_PATTERNS) {
    // Reset lastIndex since we reuse global regexes across calls
    pattern.lastIndex = 0;

    let matchCount = 0;
    redacted = redacted.replace(pattern, (match: string) => {
      matchCount++;
      return typeof replacement === "function" ? replacement(match) : replacement;
    });

    if (matchCount > 0) {
      counts[label] = matchCount;
      totalRedactions += matchCount;
    }
  }

  return { text: redacted, counts, totalRedactions };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default function handler(event: InternalHookEvent): void {
  if (event.type !== "message" || event.action !== "sent") return;

  const content = event.context.content as string | undefined;
  if (typeof content !== "string" || content.length === 0) return;

  const { text, counts, totalRedactions } = redact(content);

  if (totalRedactions > 0) {
    const summary = Object.entries(counts)
      .map(([label, count]) => `${label}=${count}`)
      .join(", ");

    console.error(
      `[pii-guard] Redacted ${totalRedactions} PII occurrence(s) in outbound message: ${summary}`
    );

    // Mutate context in place — official pattern
    event.context.content = text;
  }
}
