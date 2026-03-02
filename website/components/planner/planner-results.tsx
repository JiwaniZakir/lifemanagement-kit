'use client';

import { useState } from 'react';
import { StreamingText } from './streaming-text';

const TABS = [
  { key: 'full', label: 'Full Plan' },
  { key: 'summary', label: 'Summary' },
  { key: 'model', label: 'Data Model' },
  { key: 'endpoints', label: 'Endpoints' },
  { key: 'skill', label: 'Skill File' },
  { key: 'steps', label: 'Steps' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function extractSection(text: string, heading: string): string {
  const patterns = [
    new RegExp(`###?\\s*${heading}[\\s\\S]*?(?=\\n###?\\s|$)`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return '';
}

function getTabContent(text: string, tab: TabKey): string {
  if (tab === 'full') return text;
  const map: Record<string, string> = {
    summary: 'Summary',
    model: 'Data Model',
    endpoints: 'API Endpoints',
    skill: 'Skill File',
    steps: 'Implementation Steps',
  };
  return extractSection(text, map[tab] ?? '') || `No "${map[tab]}" section found yet.`;
}

interface PlannerResultsProps {
  text: string;
  isStreaming: boolean;
  prompt: string;
  onSubmit: () => void;
}

export function PlannerResults({
  text,
  isStreaming,
  prompt,
  onSubmit,
}: PlannerResultsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('full');

  if (!text) return null;

  return (
    <div className="glass mt-4 overflow-hidden">
      {/* Tab bar */}
      <div className="flex gap-0 overflow-x-auto border-b border-[#ffffff0d]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 px-3.5 py-2.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? 'border-b border-[#7c6aef] text-white'
                : 'text-[#ffffff4d] hover:text-[#ffffff80]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto p-5">
        <StreamingText
          text={getTabContent(text, activeTab)}
          isStreaming={isStreaming && activeTab === 'full'}
        />
      </div>

      {/* Submit button */}
      {!isStreaming && text.length > 0 && (
        <div className="border-t border-[#ffffff0d] px-5 py-3">
          <button
            onClick={onSubmit}
            className="rounded-lg border border-[#ffffff14] px-4 py-2 text-xs font-light text-[#ffffffcc] transition-all hover:border-[#ffffff26] hover:text-white"
          >
            Submit to Community
          </button>
        </div>
      )}
    </div>
  );
}
