// Simple token-bucket rate limiter keyed by userId
// Stores Map of userId -> { count, resetAt }
// Limit: 5 deploys per user per hour

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(userId);

  // No entry or window expired — start fresh
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + WINDOW_MS;
    store.set(userId, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt };
  }

  // Within window — check count
  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count, resetAt: entry.resetAt };
}
