'use client';

import { useState } from 'react';
import {
  DollarSign,
  Calendar,
  GraduationCap,
  Heart,
  Share2,
  PenTool,
  Newspaper,
  Shield,
  ChevronDown,
  Lightbulb,
} from 'lucide-react';
import { AEGIS_SKILLS } from '@/lib/skills-data';
import type { SkillDetail } from '@/lib/skills-data';
import type { LucideIcon } from 'lucide-react';
import { usePlannerStore } from '@/lib/stores/planner-store';

const ICON_MAP: Record<string, LucideIcon> = {
  DollarSign,
  Calendar,
  GraduationCap,
  Heart,
  Share2,
  PenTool,
  Newspaper,
  Shield,
};

function SkillCard({ skill, index }: { skill: SkillDetail; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ICON_MAP[skill.icon];
  const setPrompt = usePlannerStore((s) => s.setPrompt);

  const handleSuggest = () => {
    setPrompt(`Improve the ${skill.name} workflow: `);
    document.getElementById('skills')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Scroll up to the planner input
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[placeholder="What do you want Aegis to do?"]');
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input.focus();
      }
    }, 300);
  };

  return (
    <div
      className="glass group cursor-pointer overflow-hidden transition-all duration-300 hover:border-[#ffffff26]"
      style={{
        animation: `fade-up 0.6s ease-out ${0.05 * index}s forwards`,
        opacity: 0,
        borderColor: expanded ? `${skill.color}33` : undefined,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Top color accent line */}
      <div className="h-[2px]" style={{ background: `${skill.color}40` }} />

      <div className="p-4">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110"
                style={{ background: `${skill.color}15` }}
              >
                <Icon size={17} style={{ color: skill.color }} />
              </div>
            )}
            <div>
              <h3 className="text-[14px] font-normal text-white">{skill.name}</h3>
              <p className="text-[10px] text-[#fff5]">{skill.endpointCount} endpoints</p>
            </div>
          </div>
          <ChevronDown
            size={14}
            className={`text-[#fff4] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>

        {/* Description */}
        <p className="mb-3 text-[11px] font-light leading-[1.6] text-[#fff8]">
          {skill.description}
        </p>

        {/* Capabilities */}
        <div className="mb-2 flex flex-wrap gap-1">
          {skill.capabilities.map((cap) => (
            <span
              key={cap}
              className="rounded-full px-2 py-0.5 text-[9px] font-medium"
              style={{ background: `${skill.color}12`, color: `${skill.color}cc` }}
            >
              {cap}
            </span>
          ))}
        </div>

        {/* Integration pills */}
        <div className="flex flex-wrap gap-1">
          {skill.integrations.map((int) => (
            <span
              key={int}
              className="rounded-full border border-[#ffffff0d] bg-[#ffffff08] px-2 py-0.5 text-[9px] font-medium text-[#fff6]"
            >
              {int}
            </span>
          ))}
        </div>
      </div>

      {/* Expanded detail panel */}
      <div
        className="overflow-hidden transition-all duration-400 ease-out"
        style={{ maxHeight: expanded ? '500px' : '0px', opacity: expanded ? 1 : 0 }}
      >
        <div className="border-t border-[#ffffff0d] px-4 pb-4 pt-3">
          {/* Workflow pipeline */}
          <p className="mb-2 text-[9px] font-medium uppercase tracking-wider text-[#fff5]">
            Workflow
          </p>
          <div className="mb-4 flex items-start gap-0">
            {skill.workflow.map((step, i) => (
              <div key={step.label} className="flex flex-1 flex-col items-center">
                {/* Step dot + connector */}
                <div className="flex w-full items-center">
                  {i > 0 && (
                    <div className="h-[2px] flex-1" style={{ background: `${skill.color}30` }} />
                  )}
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-medium text-white"
                    style={{ background: `${skill.color}60` }}
                  >
                    {i + 1}
                  </div>
                  {i < skill.workflow.length - 1 && (
                    <div className="h-[2px] flex-1" style={{ background: `${skill.color}30` }} />
                  )}
                </div>
                {/* Label + detail */}
                <p className="mt-1.5 text-center text-[9px] font-medium text-[#fffc]">
                  {step.label}
                </p>
                <p className="mt-0.5 text-center text-[8px] leading-[1.4] text-[#fff5]">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Data flow */}
          <div className="mb-3 rounded-lg bg-[#ffffff05] px-3 py-2">
            <p className="text-[8px] font-medium uppercase tracking-wider text-[#fff4]">Data flow</p>
            <p className="mt-0.5 font-mono text-[9px] leading-[1.5] text-[#fff8]">
              {skill.dataFlow}
            </p>
          </div>

          {/* Example */}
          <div className="mb-3 rounded-lg bg-[#ffffff05] px-3 py-2">
            <p className="text-[8px] font-medium uppercase tracking-wider text-[#fff4]">Example</p>
            <p className="mt-0.5 text-[10px] font-light italic leading-[1.5] text-[#fff9]">
              {skill.example}
            </p>
          </div>

          {/* Suggest improvement button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSuggest();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#ffffff0d] bg-[#ffffff08] px-3 py-2 text-[10px] font-medium text-[#fff9] transition-all hover:border-[#ffffff1a] hover:bg-[#ffffff14] hover:text-white"
          >
            <Lightbulb size={12} />
            Suggest an improvement
          </button>
        </div>
      </div>
    </div>
  );
}

export function SkillsShowcase() {
  return (
    <section id="skills" className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="mb-8 text-center">
        <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-normal tracking-tight text-white">
          Capabilities
        </h2>
        <p className="mt-2 text-[clamp(12px,0.85vw,14px)] font-light leading-[1.7] text-[#fff6]">
          8 skills spanning finance, health, education, and social media.
          Tap any card to see how it works.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AEGIS_SKILLS.map((skill, i) => (
          <SkillCard key={skill.id} skill={skill} index={i} />
        ))}
      </div>
    </section>
  );
}
