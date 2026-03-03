import { auth } from '@/lib/auth';
import { forkRepo, createFeatureBranch, commitFeatureFiles } from '@/lib/github-fork';
import { generateFeatureFiles, slugify } from '@/lib/generate-feature-files';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.accessToken || session.provider !== 'github') {
    return Response.json(
      { error: 'GitHub authentication required.' },
      { status: 401 },
    );
  }

  let body: { title: string; rawPlan: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { title, rawPlan } = body;
  if (!title || !rawPlan) {
    return Response.json(
      { error: 'title and rawPlan are required.' },
      { status: 400 },
    );
  }

  try {
    const token = session.accessToken;
    const slug = slugify(title);
    const branchName = `feature/${slug}`;

    // 1. Fork the repo
    const fork = await forkRepo(token);

    // 2. Wait briefly for fork to be ready (GitHub is eventually consistent)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Create feature branch
    const branchUrl = await createFeatureBranch(token, fork.fullName, branchName);

    // 4. Generate files from plan
    const files = generateFeatureFiles(slug, rawPlan, title);

    // 5. Commit files to branch
    const filesCreated = await commitFeatureFiles(token, fork.fullName, branchName, files);

    return Response.json({
      forkUrl: fork.htmlUrl,
      branchUrl,
      branchName,
      filesCreated,
    });
  } catch (error) {
    console.error('Fork error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Fork operation failed.' },
      { status: 500 },
    );
  }
}
