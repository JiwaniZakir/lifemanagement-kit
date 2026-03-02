export async function GET() {
  return Response.json({
    configured: !!process.env.GITHUB_TOKEN,
  });
}
