import Anthropic from '@anthropic-ai/sdk';
import { PLANNER_SYSTEM_PROMPT, PLANNER_MAX_TOKENS } from '@/lib/planner-prompt';
import { NextRequest } from 'next/server';

// Rate limiter with automatic cleanup of stale entries
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes
let lastCleanup = Date.now();

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Periodically prune stale IP entries to prevent memory leak
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    for (const [key, timestamps] of rateLimitMap) {
      const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
      if (recent.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, recent);
      }
    }
  }

  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    return Response.json(
      { error: 'Rate limit exceeded. Try again in a minute.' },
      { status: 429 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'AI planner is not configured.' },
      { status: 503 },
    );
  }

  let body: { prompt: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const { prompt } = body;
  if (!prompt || typeof prompt !== 'string' || prompt.length > 2000) {
    return Response.json(
      { error: 'Prompt is required and must be under 2000 characters.' },
      { status: 400 },
    );
  }

  const model = process.env.PLANNER_MODEL ?? 'claude-sonnet-4-6';
  const client = new Anthropic({ apiKey });

  const stream = await client.messages.stream({
    model,
    max_tokens: PLANNER_MAX_TOKENS,
    system: PLANNER_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Design a complete, production-ready implementation plan for this Aegis feature:\n\n**Feature request:** ${prompt}\n\nProduce every section from the output format. Include copy-paste-ready code for every file. Check API feasibility before designing integrations.`,
      },
    ],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`),
            );
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Stream error';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
        );
      } finally {
        // Always send [DONE] so the client exits the read loop cleanly
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
