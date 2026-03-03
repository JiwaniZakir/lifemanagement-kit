'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePlannerStore } from '@/lib/stores/planner-store';
import { SignInButton } from '@/components/auth/sign-in-button';
import { LocalSetupPanel } from './local-setup-panel';
import { analytics } from '@/lib/analytics';

function getContributorTier(count: number) {
  if (count >= 5) return { label: 'Gold Contributor', color: '#f59e0b', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' };
  if (count >= 3) return { label: 'Silver Contributor', color: '#94a3b8', border: 'border-gray-400/30', bg: 'bg-gray-400/10' };
  return { label: 'Aegis Contributor', color: '#7c6aef', border: 'border-[#7c6aef33]', bg: 'bg-[#7c6aef0d]' };
}

export function StepSubmit() {
  const {
    prompt,
    rawText,
    plan,
    diagramNodes,
    diagramEdges,
    editableTitle,
    setEditableTitle,
    githubConfigured,
    setGithubConfigured,
    submitterName,
    setSubmitterName,
    submitterNotes,
    setSubmitterNotes,
    isSubmitting,
    setIsSubmitting,
    submissionResult,
    setSubmissionResult,
    submissionError,
    setSubmissionError,
    setStep,
    reset,
  } = usePlannerStore();

  const [submissionCount, setSubmissionCount] = useState(0);
  const [copied, setCopied] = useState(false);

  // Check GitHub config on mount
  useEffect(() => {
    if (githubConfigured !== null) return;
    fetch('/api/submit/status')
      .then((r) => r.json())
      .then((d) => setGithubConfigured(d.configured ?? false))
      .catch(() => setGithubConfigured(false));
  }, [githubConfigured, setGithubConfigured]);

  useEffect(() => {
    const count = parseInt(localStorage.getItem('aegis-submissions') ?? '0', 10);
    setSubmissionCount(count);
    const savedName = localStorage.getItem('aegis-contributor-name');
    if (savedName && !submitterName) setSubmitterName(savedName);
  }, [submitterName, setSubmitterName]);

  const handleCopyPlan = useCallback(() => {
    const text = `# ${editableTitle || plan?.meta.title || 'Feature Request'}\n\n${rawText}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [editableTitle, plan, rawText]);

  const handleSubmit = useCallback(async () => {
    if (!submitterName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionError('');

    try {
      const rawTitle = editableTitle || prompt;
      const title = rawTitle.length > 100
        ? `${rawTitle.slice(0, 97)}...`
        : rawTitle;

      const diagramJson = JSON.stringify(
        { nodes: diagramNodes, edges: diagramEdges },
        null,
        2,
      );

      const editDesc = usePlannerStore.getState().editableDescription;

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: editDesc.trim() || undefined,
          request: prompt,
          plan: rawText,
          submitter: submitterName.trim(),
          notes: submitterNotes.trim() || undefined,
          diagramJson,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmissionError(data.error ?? 'Submission failed.');
      } else {
        analytics.featureSubmitted(title);
        setSubmissionResult(data);
        const newCount = submissionCount + 1;
        localStorage.setItem('aegis-submissions', String(newCount));
        localStorage.setItem('aegis-contributor-name', submitterName.trim());
        setSubmissionCount(newCount);
      }
    } catch {
      setSubmissionError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    submitterName,
    submitterNotes,
    isSubmitting,
    prompt,
    rawText,
    editableTitle,
    diagramNodes,
    diagramEdges,
    submissionCount,
    setIsSubmitting,
    setSubmissionError,
    setSubmissionResult,
  ]);

  // Success state with confetti
  if (submissionResult) {
    return (
      <SuccessScreen
        submissionResult={submissionResult}
        submitterName={submitterName}
        submissionCount={submissionCount}
        reset={reset}
      />
    );
  }

  // Unconfigured fallback
  if (githubConfigured === false) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="glass p-6">
          <h3 className="mb-1 text-[16px] font-normal text-white">
            Share Your Plan
          </h3>
          <p className="mb-4 text-[12px] font-light leading-[1.7] text-[#fff9]">
            Community submissions are being set up. In the meantime, you can copy your plan
            or create a GitHub issue directly.
          </p>

          {plan && (
            <div className="mb-4 rounded-lg border border-[#ffffff0d] bg-[#ffffff08] px-3 py-2">
              <p className="text-[13px] font-light text-white">{editableTitle || plan.meta.title}</p>
              <p className="mt-1 text-[11px] text-[#fff6]">
                {plan.meta.newFiles.length} files &middot; {plan.meta.impact} impact
              </p>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleCopyPlan}
              className="w-full rounded-lg bg-white/90 px-4 py-2.5 text-[12px] font-medium text-black transition-all hover:bg-white"
            >
              {copied ? 'Copied!' : 'Copy Plan to Clipboard'}
            </button>
            <a
              href="https://github.com/JiwaniZakir/lifemanagement-kit/issues/new?labels=feature-request,ai-planned&template=feature_request.md"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-[#ffffff14] px-4 py-2.5 text-center text-[12px] font-light text-[#fffc] transition-all hover:border-[#ffffff26] hover:text-white"
            >
              Create GitHub Issue Manually
            </a>
          </div>

          {submissionCount > 0 && (
            <p className="mt-3 text-center text-[11px] text-[#7c6aef]">
              Aegis Contributor — {submissionCount} feature{submissionCount !== 1 ? 's' : ''} planned
            </p>
          )}
        </div>
      </div>
    );
  }

  // Loading config check
  if (githubConfigured === null) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="glass flex items-center justify-center p-8">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7c6aef]" />
          <p className="ml-2 text-[12px] font-light text-[#fff6]">Checking configuration...</p>
        </div>
      </div>
    );
  }

  // Normal submit form
  return (
    <div className="wizard-step-enter mx-auto w-full max-w-md">
      <div className="glass p-6">
        <h3 className="mb-1 text-[16px] font-normal text-white">
          Submit for Review
        </h3>
        <p className="mb-4 text-[12px] font-light leading-[1.7] text-[#fff9]">
          Creates a GitHub issue with your feature request, AI plan, and architecture diagram.
          A maintainer will review before it&apos;s approved.
        </p>

        {/* Editable feature title */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#fff4]">
            Feature Title
          </label>
          <input
            type="text"
            value={editableTitle}
            onChange={(e) => setEditableTitle(e.target.value)}
            placeholder={plan?.meta.title ?? 'Name your feature'}
            maxLength={100}
            className="w-full rounded-lg border border-[#7c6aef33] bg-[#7c6aef08] px-4 py-2.5 text-[14px] font-light text-white placeholder-[#fff4] outline-none transition-colors focus:border-[#7c6aef66]"
          />
          {plan && (
            <p className="mt-1.5 text-[11px] text-[#fff6]">
              {plan.meta.newFiles.length} files &middot; {plan.meta.impact} impact &middot;{' '}
              {plan.meta.affectedServices.join(', ')}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your name"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            maxLength={100}
            className="w-full rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-4 py-2.5 text-[14px] font-light text-white placeholder-[#fff4] outline-none focus:border-[#7c6aef40]"
          />
          <textarea
            placeholder="Notes for the maintainer (optional)"
            value={submitterNotes}
            onChange={(e) => setSubmitterNotes(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-4 py-2.5 text-[14px] font-light text-white placeholder-[#fff4] outline-none focus:border-[#7c6aef40]"
          />

          {submissionError && (
            <p className="text-[12px] text-red-400/80">{submissionError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(3)}
              className="rounded-lg border border-[#ffffff14] px-4 py-2.5 text-[12px] font-light text-[#fff9] transition-all hover:border-[#ffffff26] hover:text-white"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!submitterName.trim() || isSubmitting}
              className="flex-1 rounded-lg bg-white/90 px-4 py-2.5 text-[12px] font-medium text-black transition-all hover:bg-white disabled:opacity-40"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feature Request'}
            </button>
          </div>
        </div>

        {submissionCount > 0 && (
          <p className="mt-3 text-center text-[11px] text-[#7c6aef]">
            Aegis Contributor — {submissionCount} feature{submissionCount !== 1 ? 's' : ''} planned
          </p>
        )}
      </div>
    </div>
  );
}

// ── Success Screen (extracted for clarity) ──

function SuccessScreen({
  submissionResult,
  submitterName,
  submissionCount,
  reset,
}: {
  submissionResult: { url: string; number: number };
  submitterName: string;
  submissionCount: number;
  reset: () => void;
}) {
  const { data: session } = useSession();
  const { rawText, editableTitle, isForkInProgress, forkResult, forkError, setIsForkInProgress, setForkResult, setForkError } =
    usePlannerStore();
  const [showLocalSetup, setShowLocalSetup] = useState(false);

  const tier = getContributorTier(submissionCount);
  const tweetText = encodeURIComponent(
    `I just proposed a feature for Aegis! Check it out: ${submissionResult.url}`,
  );

  const handleFork = useCallback(async () => {
    if (isForkInProgress) return;
    setIsForkInProgress(true);
    setForkError('');

    try {
      const res = await fetch('/api/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editableTitle || 'feature',
          rawPlan: rawText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForkError(data.error ?? 'Fork failed.');
      } else {
        analytics.featureForked(submissionResult.number);
        setForkResult(data);
      }
    } catch {
      setForkError('Network error. Please try again.');
    } finally {
      setIsForkInProgress(false);
    }
  }, [isForkInProgress, rawText, editableTitle, setIsForkInProgress, setForkError, setForkResult]);

  return (
    <div className="mx-auto w-full max-w-lg text-center">
      {/* Confetti burst */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="confetti-particle absolute"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: '-10px',
              width: `${6 + Math.random() * 6}px`,
              height: `${6 + Math.random() * 6}px`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              background: ['#7c6aef', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6', '#06b6d4'][
                i % 6
              ],
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${1.5 + Math.random() * 1.5}s`,
            }}
          />
        ))}
      </div>

      <div className="glass p-8">
        <div className="mb-4 text-4xl text-green-400">{'\u2713'}</div>
        <h3 className="mb-1 text-[18px] font-normal text-white">
          Thank you, {submitterName}!
        </h3>
        <p className="mb-4 text-[13px] font-light text-[#fff9]">
          Your feature request has been submitted for review.
        </p>

        <div className="space-y-2">
          <a
            href={submissionResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg bg-[#7c6aef] px-4 py-2 text-[12px] font-medium text-white transition-all hover:bg-[#6b5bd6]"
          >
            View on GitHub
          </a>
          <a
            href={`/community?track=${submissionResult.number}`}
            className="block text-[12px] text-[#7c6aef] transition-colors hover:text-[#9b8df7]"
          >
            Track Status
          </a>
          <a
            href={`https://x.com/intent/tweet?text=${tweetText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[12px] text-[#fff6] transition-colors hover:text-[#fff9]"
          >
            Share on X
          </a>
        </div>

        {/* Contributor badge */}
        <div className="mt-4 flex justify-center">
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-medium ${tier.border} ${tier.bg}`}
            style={{ color: tier.color }}
          >
            {tier.label} — {submissionCount} feature{submissionCount !== 1 ? 's' : ''} planned
          </span>
        </div>

        {/* Build It Yourself section */}
        <div className="mt-6 border-t border-[#ffffff0d] pt-5 text-left">
          <h4 className="mb-2 text-[13px] font-medium text-white">Build It Yourself</h4>

          {forkResult ? (
            <div className="space-y-2">
              <p className="text-[11px] text-green-400">Fork created with feature branch!</p>
              <a
                href={forkResult.forkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-[11px] text-[#7c6aef] hover:text-[#9b8df7]"
              >
                Fork: {forkResult.forkUrl}
              </a>
              <a
                href={forkResult.branchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-[11px] text-[#7c6aef] hover:text-[#9b8df7]"
              >
                Branch: {forkResult.branchName}
              </a>
              <div className="rounded-lg border border-[#ffffff0d] bg-[#ffffff05] p-2">
                <p className="mb-1 text-[10px] text-[#fff4]">Clone command</p>
                <code className="block break-all text-[10px] text-[#fff9]">
                  git clone -b {forkResult.branchName} {forkResult.forkUrl}.git
                </code>
              </div>
              <p className="text-[10px] text-[#fff6]">
                Files created: {forkResult.filesCreated.join(', ')}
              </p>
            </div>
          ) : session?.provider === 'github' ? (
            <div>
              <button
                onClick={handleFork}
                disabled={isForkInProgress}
                className="w-full rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-4 py-2.5 text-[12px] text-[#fffc] transition-all hover:border-[#ffffff26] hover:text-white disabled:opacity-40"
              >
                {isForkInProgress ? 'Forking...' : 'Fork & Create Branch'}
              </button>
              {forkError && (
                <p className="mt-1 text-[11px] text-red-400/80">{forkError}</p>
              )}
              <p className="mt-1.5 text-[10px] text-[#fff4]">
                Creates a fork on your GitHub with a feature branch containing generated files.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-light text-[#fff6]">
                Sign in with GitHub to fork the repo and create a feature branch with generated implementation files.
              </p>
              <SignInButton provider="github" label="Sign in with GitHub to fork" />
            </div>
          )}
        </div>

        {/* Run Locally section */}
        <div className="mt-5 border-t border-[#ffffff0d] pt-5 text-left">
          <button
            onClick={() => setShowLocalSetup(!showLocalSetup)}
            className="flex w-full items-center justify-between text-[13px] font-medium text-white"
          >
            Run Locally
            <span className="text-[11px] text-[#fff4]">{showLocalSetup ? 'Hide' : 'Show'}</span>
          </button>
          {showLocalSetup && (
            <div className="mt-3">
              <LocalSetupPanel />
            </div>
          )}
        </div>

        <button
          onClick={reset}
          className="mt-5 text-[12px] font-light text-[#fff6] transition-colors hover:text-[#fff9]"
        >
          Plan another feature
        </button>
      </div>
    </div>
  );
}
