'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlannerStore } from '@/lib/stores/planner-store';

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
      const title = editableTitle
        ? (editableTitle.length > 80
            ? `[Feature] ${editableTitle.slice(0, 77)}...`
            : `[Feature] ${editableTitle}`)
        : (prompt.length > 80
            ? `[Feature] ${prompt.slice(0, 77)}...`
            : `[Feature] ${prompt}`);

      const diagramJson = JSON.stringify(
        { nodes: diagramNodes, edges: diagramEdges },
        null,
        2,
      );

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
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
    const tier = getContributorTier(submissionCount);
    const tweetText = encodeURIComponent(
      `I just proposed a feature for @AegisIntel! Check it out: ${submissionResult.url}`,
    );

    return (
      <div className="mx-auto w-full max-w-md text-center">
        {/* Confetti burst */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
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

          <button
            onClick={reset}
            className="mt-4 text-[12px] font-light text-[#fff6] transition-colors hover:text-[#fff9]"
          >
            Plan another feature
          </button>
        </div>
      </div>
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

        {/* Preview */}
        {plan && (
          <div className="mb-4 rounded-lg border border-[#ffffff0d] bg-[#ffffff08] px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#fff4]">
              Feature
            </p>
            <p className="text-[13px] font-light text-white">{editableTitle || plan.meta.title}</p>
            <p className="mt-1 text-[11px] text-[#fff6]">
              {plan.meta.newFiles.length} files &middot; {plan.meta.impact} impact &middot;{' '}
              {plan.meta.affectedServices.join(', ')}
            </p>
          </div>
        )}

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

          <button
            onClick={handleSubmit}
            disabled={!submitterName.trim() || isSubmitting}
            className="w-full rounded-lg bg-white/90 px-4 py-2.5 text-[12px] font-medium text-black transition-all hover:bg-white disabled:opacity-40"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feature Request'}
          </button>
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
