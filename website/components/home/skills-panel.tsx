'use client';

import { useState } from 'react';

const skills = [
  { id: 'aegis-finance', name: 'Finance', description: 'Banking + investment queries', icon: '💰', color: '#22c55e' },
  { id: 'aegis-calendar', name: 'Calendar', description: 'Events + free slots', icon: '📅', color: '#3b82f6' },
  { id: 'aegis-lms', name: 'LMS', description: 'Canvas assignments + grades', icon: '📚', color: '#f59e0b' },
  { id: 'aegis-health', name: 'Health', description: 'Metrics + goals', icon: '❤️', color: '#ec4899' },
  { id: 'aegis-social', name: 'Social', description: 'LinkedIn + X posting', icon: '📢', color: '#8b5cf6' },
  { id: 'aegis-content', name: 'Content', description: 'Content generation', icon: '✍️', color: '#06b6d4' },
  { id: 'aegis-briefing', name: 'Briefing', description: 'Daily/weekly digests', icon: '📋', color: '#f97316' },
  { id: 'aegis-security', name: 'Security', description: 'PII awareness + audit', icon: '🔒', color: '#64748b' },
];

interface SkillsPanelProps {
  instanceId: string;
  enabledSkills: string[];
}

export function SkillsPanel({ instanceId, enabledSkills: initial }: SkillsPanelProps) {
  const [enabledSkills, setEnabledSkills] = useState<string[]>(initial);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleSkill = async (skillId: string) => {
    setToggling(skillId);
    setError(null);
    const enabled = !enabledSkills.includes(skillId);

    try {
      const res = await fetch(`/api/instances/${instanceId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, enabled }),
      });

      if (res.ok) {
        setEnabledSkills((prev) =>
          enabled ? [...prev, skillId] : prev.filter((s) => s !== skillId),
        );
      } else {
        setError(`Failed to toggle ${skillId}`);
      }
    } catch {
      setError('Could not reach server.');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div>
      <h3 className="mb-4 text-[14px] font-medium text-white">Skills</h3>
      {error && (
        <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {skills.map((skill) => {
          const enabled = enabledSkills.includes(skill.id);
          const isToggling = toggling === skill.id;

          return (
            <button
              key={skill.id}
              onClick={() => toggleSkill(skill.id)}
              disabled={isToggling}
              className={`rounded-xl border p-4 text-left transition-all ${
                enabled
                  ? 'border-[#7c6aef33] bg-[#7c6aef0d]'
                  : 'border-[#ffffff0d] bg-[#ffffff04] opacity-60'
              } hover:opacity-100 disabled:cursor-wait`}
            >
              <span className="text-lg">{skill.icon}</span>
              <p className="mt-1.5 text-[12px] font-medium text-white">{skill.name}</p>
              <p className="text-[10px] text-[#fff6]">{skill.description}</p>
              <div className="mt-2 flex items-center gap-1">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-green-400' : 'bg-gray-600'}`}
                />
                <span className="text-[9px] text-[#fff4]">
                  {isToggling ? '...' : enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
