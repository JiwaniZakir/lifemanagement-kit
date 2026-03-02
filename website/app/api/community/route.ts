import { listCommunityIssues } from '@/lib/github';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = (searchParams.get('status') ?? 'all') as
    | 'all'
    | 'pending'
    | 'approved'
    | 'rejected';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);

  try {
    const data = await listCommunityIssues({ status, page, perPage });
    return Response.json(data, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Community board error:', error);
    return Response.json(
      { issues: [], total: 0, configured: false },
      { status: 500 },
    );
  }
}
