'use client';

import { useCallback, useRef } from 'react';
import { usePlannerStore } from '@/lib/stores/planner-store';
import { parsePlan } from '@/lib/parse-plan';
import { BASE_NODES, BASE_EDGES } from '@/lib/architecture-nodes';
import { StreamingProgress } from './streaming-progress';
import type { Node, Edge } from '@xyflow/react';

const EXAMPLE_CHIPS = [
  'Track Spotify listening history',
  'Add Todoist task sync',
  'Monitor GitHub notifications',
  'Integrate Apple Health via Shortcuts',
  'Add budget alerts for overspending',
  'Sync Notion databases for notes',
];

export function StepDescribe() {
  const {
    prompt,
    setPrompt,
    isStreaming,
    setIsStreaming,
    error,
    setError,
    appendText,
    setStep,
    setPlan,
    setDiagramNodes,
    setDiagramEdges,
  } = usePlannerStore();

  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isStreaming) return;

    setError('');
    // Reset raw text in store
    usePlannerStore.setState({ rawText: '' });
    setIsStreaming(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let fullText = '';

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
              fullText += parsed.text;
              appendText(parsed.text);
            }
            if (parsed.error) {
              setError(parsed.error);
            }
          } catch {
            // skip malformed SSE
          }
        }
      }

      // Stream complete — parse plan and advance
      if (fullText.length > 0) {
        const plan = parsePlan(fullText);
        setPlan(plan);

        // Merge base architecture with proposed nodes
        const proposedNodes: Node[] = plan.meta.newDiagramNodes.map((n, i) => ({
          id: n.id,
          type: 'proposed',
          position: { x: 550 + (i % 2) * 180, y: 60 + Math.floor(i / 2) * 100 },
          data: { label: n.label, status: n.status, nodeType: n.type },
        }));

        const proposedEdges: Edge[] = plan.meta.newDiagramEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          style: { stroke: 'rgba(124, 106, 239, 0.5)', strokeDasharray: '5 5' },
          animated: true,
        }));

        setDiagramNodes([...BASE_NODES, ...proposedNodes]);
        setDiagramEdges([...BASE_EDGES, ...proposedEdges]);
        setStep(2);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Connection failed. Please try again.');
    } finally {
      setIsStreaming(false);
    }
  }, [prompt, isStreaming, setError, setIsStreaming, appendText, setPlan, setDiagramNodes, setDiagramEdges, setStep]);

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* Onboarding paragraph */}
      <p className="mb-4 text-center text-[13px] font-light leading-[1.7] text-[#fff8]">
        Propose a new feature for Aegis. Our AI architect will design a complete implementation plan
        with data models, endpoints, and architecture changes.
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
            className="shrink-0 rounded-lg bg-white/90 px-5 py-2 text-[12px] font-medium leading-[12px] text-black transition-all hover:bg-white disabled:opacity-30"
          >
            {isStreaming ? 'Planning...' : 'Plan'}
          </button>
        </div>
      </div>

      {/* Example chips */}
      {!isStreaming && !usePlannerStore.getState().rawText && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setPrompt(chip)}
              className="rounded-full border border-[#ffffff0d] bg-[#ffffff08] px-3 py-1 text-[11px] font-light text-[#fff6] transition-all hover:border-[#ffffff1a] hover:text-[#fff9]"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* See existing capabilities */}
      {!isStreaming && !usePlannerStore.getState().rawText && (
        <p className="mt-3 text-center">
          <a
            href="#skills"
            className="text-[11px] font-light text-[#7c6aef] transition-colors hover:text-[#9b8df7]"
          >
            See what Aegis already does
          </a>
        </p>
      )}

      {/* Streaming progress visualization */}
      {isStreaming && <StreamingProgress />}

      {error && (
        <p className="mt-3 text-center text-[12px] font-light text-red-400/80">{error}</p>
      )}
    </div>
  );
}
