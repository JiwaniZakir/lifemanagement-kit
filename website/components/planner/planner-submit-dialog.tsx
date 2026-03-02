'use client';

import { useState } from 'react';

interface PlannerSubmitDialogProps {
  open: boolean;
  onClose: () => void;
  prompt: string;
  plan: string;
}

export function PlannerSubmitDialog({
  open,
  onClose,
  prompt,
  plan,
}: PlannerSubmitDialogProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    url?: string;
    error?: string;
  } | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setResult(null);

    try {
      const title = prompt.length > 80
        ? prompt.slice(0, 77) + '...'
        : prompt;

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[Feature] ${title}`,
          request: prompt,
          plan,
          submitter: name.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? 'Submission failed.' });
      } else {
        setResult({ url: data.url });
      }
    } catch {
      setResult({ error: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass mx-4 w-full max-w-md p-6">
        <h3 className="mb-1 text-[16px] font-normal text-white">
          Submit to Community
        </h3>
        <p className="mb-4 text-[12px] font-light leading-[1.7] text-[#fff9]">
          Creates a GitHub issue with your feature request and the AI-generated plan.
        </p>

        {result?.url ? (
          <div className="space-y-3">
            <p className="text-[12px] text-green-400/80">
              Issue created successfully.
            </p>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[12px] text-[#7c6aef] underline"
            >
              View on GitHub
            </a>
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-[#ffffff14] px-4 py-2 text-[12px] font-light text-[#fffc] transition-all hover:border-[#ffffff26]"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-4 py-2.5 text-[14px] font-light text-white placeholder-[#fff4] outline-none focus:border-[#7c6aef40]"
            />
            {result?.error && (
              <p className="text-[12px] text-red-400/80">{result.error}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-[#ffffff14] px-4 py-2 text-[12px] font-light text-[#fffc] transition-all hover:border-[#ffffff26]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || submitting}
                className="flex-1 rounded-lg bg-white/90 px-4 py-2 text-[12px] font-medium text-black transition-all hover:bg-white disabled:opacity-40"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
