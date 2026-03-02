import { createFeatureIssue } from '@/lib/github';
import { NextRequest } from 'next/server';

// Rate limiter: 3 submissions per hour per IP
const submitLimitMap = new Map<string, number[]>();
const SUBMIT_LIMIT = 3;
const SUBMIT_WINDOW_MS = 3_600_000;

function isSubmitLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = submitLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < SUBMIT_WINDOW_MS);
  if (recent.length >= SUBMIT_LIMIT) return true;
  recent.push(now);
  submitLimitMap.set(ip, recent);
  return false;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (isSubmitLimited(ip)) {
    return Response.json(
      { error: 'Submission limit reached. Try again later.' },
      { status: 429 },
    );
  }

  let body: { title: string; request: string; plan: string; submitter: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { title, request: featureRequest, plan, submitter } = body;

  if (!title || !featureRequest || !plan || !submitter) {
    return Response.json(
      { error: 'All fields are required: title, request, plan, submitter.' },
      { status: 400 },
    );
  }

  if (title.length > 200 || submitter.length > 100) {
    return Response.json(
      { error: 'Title or name too long.' },
      { status: 400 },
    );
  }

  try {
    const result = await createFeatureIssue({
      title,
      request: featureRequest,
      plan,
      submitter,
    });
    return Response.json(result);
  } catch (error) {
    console.error('GitHub submission error:', error);
    return Response.json(
      { error: 'Failed to create GitHub issue. Try again later.' },
      { status: 500 },
    );
  }
}
