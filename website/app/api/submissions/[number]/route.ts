import { getIssueStatus } from '@/lib/github';
import { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  if (!process.env.GITHUB_TOKEN) {
    return Response.json(
      { error: 'GitHub integration not configured.' },
      { status: 503 },
    );
  }

  const { number } = await params;
  const issueNumber = parseInt(number, 10);

  if (isNaN(issueNumber) || issueNumber < 1) {
    return Response.json(
      { error: 'Invalid issue number.' },
      { status: 400 },
    );
  }

  try {
    const status = await getIssueStatus(issueNumber);
    return Response.json(status);
  } catch (error) {
    console.error('Issue status fetch error:', error);
    return Response.json(
      { error: 'Failed to fetch issue status.' },
      { status: 500 },
    );
  }
}
