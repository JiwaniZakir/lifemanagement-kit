import { enabledProviders } from '@/lib/auth';

export async function GET() {
  return Response.json(enabledProviders);
}
