/**
 * Budget Guard Hook — track estimated token spend, warn at 80/95/100% of
 * daily and monthly budgets.
 *
 * Events: message:sent
 *
 * Persistence: POSTs usage records to data-api and GETs budget status from
 * data-api. No local state files — survives container restarts.
 *
 * Claude pricing (as of 2025-02):
 *   claude-sonnet-4-6         : $3.00 / 1M input,  $15.00 / 1M output
 *   claude-haiku-4-5-20251001 : $0.80 / 1M input,  $4.00  / 1M output
 *
 * Token estimation heuristic: 1 token ~ 4 characters.
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

interface BudgetUsageResponse {
  daily_spend_usd: number;
  monthly_spend_usd: number;
  daily_budget_usd: number;
  monthly_budget_usd: number;
  daily_pct: number;
  monthly_pct: number;
}

type BudgetStatus = "ok" | "warning" | "critical" | "exceeded";

interface BudgetCheckResult {
  status: BudgetStatus;
  daily_pct: number;
  monthly_pct: number;
  daily_budget: number;
  monthly_budget: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHARS_PER_TOKEN = 4;

// Pricing: USD per 1M tokens
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
  default: { input: 3.0, output: 15.0 },
};

// ---------------------------------------------------------------------------
// Configuration from environment
// ---------------------------------------------------------------------------

function getDataApiUrl(): string {
  return process.env.DATA_API_URL ?? "http://data-api:8000";
}

function getToken(): string {
  const token = process.env.DATA_API_TOKEN;
  if (!token) {
    console.error("[budget-guard] DATA_API_TOKEN not set — budget tracking will fail");
    return "";
  }
  return token;
}

function getDailyBudget(): number {
  const val = process.env.LLM_DAILY_BUDGET_USD;
  if (val !== undefined) {
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 5.0;
}

function getMonthlyBudget(): number {
  const val = process.env.LLM_MONTHLY_BUDGET_USD;
  if (val !== undefined) {
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 50.0;
}

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// ---------------------------------------------------------------------------
// Data API communication
// ---------------------------------------------------------------------------

async function persistToDataApi(
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const token = getToken();
  if (!token) return;

  const url = `${getDataApiUrl()}/budget/record`;
  const body = {
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  };

  // Fire-and-forget: log errors but never block the event pipeline
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (!res.ok) {
        console.error(
          `[budget-guard] data-api /budget/record returned HTTP ${res.status}`
        );
      }
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[budget-guard] Failed to POST budget record: ${message}`);
    });
}

async function fetchBudgetStatus(): Promise<BudgetCheckResult> {
  const token = getToken();
  const dailyBudget = getDailyBudget();
  const monthlyBudget = getMonthlyBudget();

  // Fallback if no token — use local budget values with zero spend
  if (!token) {
    return {
      status: "ok",
      daily_pct: 0,
      monthly_pct: 0,
      daily_budget: dailyBudget,
      monthly_budget: monthlyBudget,
    };
  }

  try {
    const url = `${getDataApiUrl()}/budget/usage`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.error(
        `[budget-guard] data-api /budget/usage returned HTTP ${res.status}`
      );
      return {
        status: "ok",
        daily_pct: 0,
        monthly_pct: 0,
        daily_budget: dailyBudget,
        monthly_budget: monthlyBudget,
      };
    }

    const data = (await res.json()) as BudgetUsageResponse;
    const dailyPct =
      dailyBudget > 0 ? (data.daily_spend_usd / dailyBudget) * 100 : 0;
    const monthlyPct =
      monthlyBudget > 0 ? (data.monthly_spend_usd / monthlyBudget) * 100 : 0;
    const maxPct = Math.max(dailyPct, monthlyPct);

    let status: BudgetStatus = "ok";
    if (maxPct >= 100) {
      status = "exceeded";
    } else if (maxPct >= 95) {
      status = "critical";
    } else if (maxPct >= 80) {
      status = "warning";
    }

    return {
      status,
      daily_pct: Math.round(dailyPct * 10) / 10,
      monthly_pct: Math.round(monthlyPct * 10) / 10,
      daily_budget: dailyBudget,
      monthly_budget: monthlyBudget,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[budget-guard] Failed to GET budget status: ${message}`);
    return {
      status: "ok",
      daily_pct: 0,
      monthly_pct: 0,
      daily_budget: dailyBudget,
      monthly_budget: monthlyBudget,
    };
  }
}

// ---------------------------------------------------------------------------
// Warning messages
// ---------------------------------------------------------------------------

function buildWarningLine(result: BudgetCheckResult): string {
  if (result.status === "warning") {
    return (
      `[Budget Warning] LLM spend at ` +
      `${result.daily_pct}% daily ($${result.daily_budget}/day), ` +
      `${result.monthly_pct}% monthly ($${result.monthly_budget}/mo). ` +
      `Consider reducing non-essential AI calls.`
    );
  }

  if (result.status === "critical") {
    return (
      `[URGENT Budget Warning] LLM spend at ` +
      `${result.daily_pct}% daily ($${result.daily_budget}/day), ` +
      `${result.monthly_pct}% monthly ($${result.monthly_budget}/mo). ` +
      `Approaching limit — non-essential calls will be blocked soon.`
    );
  }

  return "";
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(event: InternalHookEvent): Promise<void> {
  if (event.type !== "message" || event.action !== "sent") return;

  const content = (event.context.content as string) ?? "";

  // Determine model — default to sonnet pricing (conservative)
  const model = (event.context.model as string) ?? "claude-sonnet-4-6";

  // Estimate tokens: treat outbound messages as output tokens
  const role = event.context.role as string | undefined;
  const isOutput = role === "assistant" || role === undefined;
  const tokens = estimateTokens(content);
  const inputTokens = isOutput ? 0 : tokens;
  const outputTokens = isOutput ? tokens : 0;

  // Persist to data-api (fire-and-forget)
  await persistToDataApi(model, inputTokens, outputTokens);

  // Fetch current budget status from data-api
  const result = await fetchBudgetStatus();

  // Log current status to stderr for monitoring
  console.error(
    `[budget-guard] ` +
      `daily=${result.daily_pct}% ` +
      `monthly=${result.monthly_pct}% ` +
      `status=${result.status}`
  );

  // At 100%: block the message — push error to event.messages, clear content
  if (result.status === "exceeded") {
    console.error(
      `[budget-guard] BLOCKED — budget exceeded ` +
        `(daily: ${result.daily_pct}% of $${result.daily_budget}, ` +
        `monthly: ${result.monthly_pct}% of $${result.monthly_budget})`
    );

    event.messages.push(
      `LLM budget exceeded. Daily: ${result.daily_pct}% of $${result.daily_budget}/day, ` +
        `Monthly: ${result.monthly_pct}% of $${result.monthly_budget}/mo. ` +
        `Non-essential AI calls are paused until the next budget period resets.`
    );
    event.context.content = "";
    return;
  }

  // At 80% or 95%: push a warning message to the user
  if (result.status === "warning" || result.status === "critical") {
    const warningLine = buildWarningLine(result);
    if (warningLine) {
      event.messages.push(warningLine);
    }
  }
}
