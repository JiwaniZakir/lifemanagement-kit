'use client';

import { useState, useRef, useCallback } from 'react';
import { PlannerResults } from './planner-results';
import { PlannerSubmitDialog } from './planner-submit-dialog';

export function PlannerChatbox() {
  const [prompt, setPrompt] = useState('');
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isStreaming) return;

    setError('');
    setStreamedText('');
    setIsStreaming(true);
    setSubmittedPrompt(prompt.trim());

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Error: ${res.status}`);
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError('No response stream.');
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              setStreamedText((prev) => prev + parsed.text);
            }
            if (parsed.error) {
              setError(parsed.error);
            }
          } catch {
            // skip malformed SSE
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Connection failed. Please try again.');
    } finally {
      setIsStreaming(false);
    }
  }, [prompt, isStreaming]);

  return (
    <section className="animate-fade-up-delay-3 mx-auto w-full max-w-xl px-6 pb-32">
      {/* Section label — hf0 bubble header: 14px/300/16px */}
      <p className="mb-3 text-center text-[14px] font-light leading-[16px] text-[#fff6]">
        Feature Planner
      </p>

      {/* Glass bubble input */}
      <div className="glass p-1">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="What do you want Aegis to do?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            maxLength={2000}
            disabled={isStreaming}
            className="flex-1 bg-transparent px-4 py-3 text-[14px] font-light leading-[16px] text-white placeholder-[#fff4] outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isStreaming}
            className="shrink-0 rounded-[0.8em] bg-white/90 px-4 py-2 text-[12px] font-medium leading-[12px] text-black transition-all hover:bg-white disabled:opacity-30"
          >
            {isStreaming ? 'Planning...' : 'Plan'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-center text-[12px] font-light text-red-400/80">{error}</p>
      )}

      {/* Results */}
      <PlannerResults
        text={streamedText}
        isStreaming={isStreaming}
        prompt={submittedPrompt}
        onSubmit={() => setShowSubmitDialog(true)}
      />

      {/* Submit dialog */}
      <PlannerSubmitDialog
        open={showSubmitDialog}
        onClose={() => setShowSubmitDialog(false)}
        prompt={submittedPrompt}
        plan={streamedText}
      />
    </section>
  );
}
