'use client';

import { useMemo } from 'react';
import { usePlannerStore } from '@/lib/stores/planner-store';

const PHASES = [
  { key: 'analyzing', label: 'Analyzing request', icon: '01' },
  { key: 'summary', label: 'Writing summary', icon: '02' },
  { key: 'model', label: 'Designing data model', icon: '03' },
  { key: 'endpoints', label: 'Planning endpoints', icon: '04' },
  { key: 'skill', label: 'Composing skill file', icon: '05' },
  { key: 'steps', label: 'Implementation steps', icon: '06' },
] as const;

function detectPhase(text: string): number {
  if (/implementation\s*steps/i.test(text)) return 5;
  if (/skill\s*file/i.test(text)) return 4;
  if (/api\s*endpoints|endpoints/i.test(text)) return 3;
  if (/data\s*model/i.test(text)) return 2;
  if (/summary/i.test(text)) return 1;
  return 0;
}

function extractLiveFiles(text: string): string[] {
  const regex = /(?:data-api\/|skills\/|hooks\/|config\/|infrastructure\/)[\w/.-]+\.\w+/g;
  const files: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = match[0].split('/').pop() ?? match[0];
    if (!files.includes(name)) files.push(name);
  }
  return files.slice(-6);
}

function extractServices(text: string): string[] {
  const services: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes('data-api') || lower.includes('data api')) services.push('data-api');
  if (lower.includes('openclaw') || lower.includes('gateway')) services.push('gateway');
  if (lower.includes('postgres')) services.push('postgres');
  if (lower.includes('whatsapp') || lower.includes('baileys')) services.push('whatsapp');
  return services;
}

function getLastLines(text: string, n: number): string[] {
  return text
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .slice(-n)
    .map((l) => {
      const clean = l.replace(/^#+\s*/, '').replace(/^\*\*.*?\*\*:?\s*/, '');
      return clean.length > 80 ? clean.slice(0, 77) + '...' : clean;
    });
}

export function StreamingProgress() {
  const rawText = usePlannerStore((s) => s.rawText);

  const phase = useMemo(() => detectPhase(rawText), [rawText]);
  const wordCount = useMemo(() => rawText.split(/\s+/).filter(Boolean).length, [rawText]);
  const files = useMemo(() => extractLiveFiles(rawText), [rawText]);
  const services = useMemo(() => extractServices(rawText), [rawText]);
  const lastLines = useMemo(() => getLastLines(rawText, 3), [rawText]);

  return (
    <div className="wizard-step-enter mx-auto mt-5 w-full max-w-xl space-y-4">
      {/* Main progress card */}
      <div className="glass overflow-hidden p-5">
        {/* Animated header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center">
            {/* Spinning ring */}
            <div className="progress-ring absolute inset-0 rounded-full border-2 border-[#7c6aef20]" />
            <div className="progress-ring-arc absolute inset-0 rounded-full border-2 border-transparent border-t-[#7c6aef]" />
            {/* Center dot */}
            <div className="h-2 w-2 rounded-full bg-[#7c6aef] shadow-[0_0_8px_#7c6aef80]" />
          </div>
          <div>
            <p className="text-[13px] font-normal text-white">
              Designing your feature
            </p>
            <p className="text-[11px] font-light text-[#fff6]">
              {wordCount > 0 ? `${wordCount} words generated` : 'Initializing...'}
            </p>
          </div>
        </div>

        {/* Phase progress */}
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {PHASES.map((p, i) => (
            <div key={p.key} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-medium transition-all duration-500 ${
                  i < phase
                    ? 'bg-[#7c6aef] text-white shadow-[0_0_10px_#7c6aef60]'
                    : i === phase
                      ? 'phase-active border border-[#7c6aef] bg-[#7c6aef20] text-[#7c6aef]'
                      : 'border border-[#ffffff0d] bg-[#ffffff05] text-[#fff3]'
                }`}
              >
                {i < phase ? '\u2713' : p.icon}
              </div>
              <span
                className={`text-center text-[8px] leading-[1.3] transition-colors duration-300 ${
                  i <= phase ? 'text-[#fff9]' : 'text-[#fff3]'
                }`}
              >
                {p.label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-4 h-[3px] overflow-hidden rounded-full bg-[#ffffff0d]">
          <div
            className="progress-bar-glow h-full rounded-full bg-gradient-to-r from-[#7c6aef] to-[#9b8df7] transition-all duration-700 ease-out"
            style={{ width: `${Math.min(((phase + 1) / PHASES.length) * 100, 100)}%` }}
          />
        </div>

        {/* Live preview */}
        {lastLines.length > 0 && (
          <div className="rounded-lg bg-[#ffffff05] px-3 py-2">
            {lastLines.map((line, i) => (
              <p
                key={i}
                className={`text-[11px] font-light leading-[1.6] ${
                  i === lastLines.length - 1
                    ? 'streaming-cursor text-[#fffc]'
                    : 'text-[#fff5]'
                }`}
              >
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Discovered items — files + services */}
      <div className="flex gap-3">
        {/* Services */}
        {services.length > 0 && (
          <div className="glass flex-1 p-3">
            <p className="mb-2 text-[9px] font-medium uppercase tracking-wider text-[#fff5]">
              Services affected
            </p>
            <div className="flex flex-wrap gap-1.5">
              {services.map((svc) => (
                <span
                  key={svc}
                  className="service-pill rounded-full border border-[#7c6aef33] bg-[#7c6aef0d] px-2 py-0.5 text-[9px] font-medium text-[#7c6aef]"
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {files.length > 0 && (
          <div className="glass flex-1 p-3">
            <p className="mb-2 text-[9px] font-medium uppercase tracking-wider text-[#fff5]">
              Files discovered
            </p>
            <div className="flex flex-col gap-1">
              {files.map((f, i) => (
                <span
                  key={f}
                  className="file-pill truncate font-mono text-[10px] text-[#fff8]"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
