'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Calendar,
  GraduationCap,
  Heart,
  Share2,
  PenTool,
  Newspaper,
  Shield,
  X,
  Lightbulb,
  ArrowRight,
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

/* ── Detail modal (near-fullscreen overlay) ── */
function SkillModal({
  skill,
  onClose,
}: {
  skill: SkillDetail;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const Icon = ICON_MAP[skill.icon];
  const setPrompt = usePlannerStore((s) => s.setPrompt);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 350);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const handleSuggest = () => {
    handleClose();
    setTimeout(() => {
      usePlannerStore.getState().setPrompt(`Improve the ${skill.name} workflow: `);
      const input = document.querySelector<HTMLInputElement>(
        'input[placeholder="What do you want Aegis to do?"]',
      );
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input.focus();
      }
    }, 400);
  };

  const animClass = closing
    ? 'skill-modal-exit'
    : mounted
      ? 'skill-modal-enter-active'
      : 'skill-modal-enter';

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center ${animClass}`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="skill-modal-backdrop absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Panel */}
      <div
        className="skill-modal-panel relative mx-4 w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#ffffff14] bg-[#0a0a0f] shadow-2xl"
        style={{ maxHeight: 'calc(100vh - 80px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div
          className="relative overflow-hidden px-8 pb-6 pt-8"
          style={{
            background: `linear-gradient(135deg, ${skill.color}15 0%, transparent 60%)`,
          }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#ffffff08] text-[#fff6] transition-all hover:bg-[#ffffff14] hover:text-white"
          >
            <X size={16} />
          </button>

          {/* Icon + title */}
          <div className="flex items-center gap-4">
            {Icon && (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: `${skill.color}20` }}
              >
                <Icon size={28} style={{ color: skill.color }} />
              </div>
            )}
            <div>
              <h2 className="text-[24px] font-normal tracking-tight text-white">
                {skill.name}
              </h2>
              <p className="mt-0.5 text-[13px] font-light text-[#fff8]">
                {skill.tagline}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="mt-4 max-w-lg text-[14px] font-light leading-[1.7] text-[#fffb]">
            {skill.description}
          </p>

          {/* Capability pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {skill.capabilities.map((cap) => (
              <span
                key={cap}
                className="rounded-full px-3 py-1 text-[11px] font-medium"
                style={{ background: `${skill.color}18`, color: skill.color }}
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Workflow section */}
        <div className="border-t border-[#ffffff0d] px-8 py-6">
          <h3 className="mb-4 text-[12px] font-medium uppercase tracking-wider text-[#fff6]">
            How it works
          </h3>

          <div className="space-y-0">
            {skill.workflow.map((step, i) => (
              <div key={step.label} className="flex gap-4">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div
                    className="skill-step-dot flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white"
                    style={{
                      background: `${skill.color}50`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  >
                    {i + 1}
                  </div>
                  {i < skill.workflow.length - 1 && (
                    <div
                      className="skill-step-line my-1 w-[2px] flex-1"
                      style={{
                        background: `${skill.color}20`,
                        animationDelay: `${i * 0.1 + 0.05}s`,
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div
                  className="skill-step-content pb-5"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <p className="text-[14px] font-normal text-white">{step.label}</p>
                  <p className="mt-0.5 text-[12px] font-light leading-[1.6] text-[#fff8]">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data flow + example */}
        <div className="border-t border-[#ffffff0d] px-8 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Data flow */}
            <div className="rounded-xl bg-[#ffffff06] p-4">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#fff5]">
                Data flow
              </p>
              <p className="text-[12px] font-light leading-[1.7] text-[#fff9]">
                {skill.dataFlow}
              </p>
            </div>

            {/* Example */}
            <div className="rounded-xl bg-[#ffffff06] p-4">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#fff5]">
                Example
              </p>
              <p className="text-[13px] font-light italic leading-[1.7] text-[#fffb]">
                {skill.example}
              </p>
            </div>
          </div>
        </div>

        {/* Integrations + actions */}
        <div className="border-t border-[#ffffff0d] px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#fff4]">
                Powered by
              </span>
              {skill.integrations.map((int) => (
                <span
                  key={int}
                  className="rounded-full border border-[#ffffff14] bg-[#ffffff08] px-3 py-1 text-[11px] font-medium text-[#fff9]"
                >
                  {int}
                </span>
              ))}
            </div>

            <button
              onClick={handleSuggest}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-medium text-white transition-all hover:opacity-80"
              style={{ background: `${skill.color}60` }}
            >
              <Lightbulb size={14} />
              Suggest an improvement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Grid card (minimal, clean) ── */
function SkillCard({
  skill,
  index,
  onOpen,
}: {
  skill: SkillDetail;
  index: number;
  onOpen: () => void;
}) {
  const Icon = ICON_MAP[skill.icon];

  return (
    <button
      onClick={onOpen}
      className="glass group cursor-pointer overflow-hidden p-5 text-left transition-all duration-300 hover:scale-[1.03] hover:border-[#ffffff26]"
      style={{
        animation: `fade-up 0.6s ease-out ${0.06 * index}s forwards`,
        opacity: 0,
      }}
    >
      {/* Icon */}
      {Icon && (
        <div
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
          style={{ background: `${skill.color}15` }}
        >
          <Icon size={20} style={{ color: skill.color }} />
        </div>
      )}

      {/* Name + tagline */}
      <h3 className="text-[15px] font-normal text-white">{skill.name}</h3>
      <p className="mt-1 text-[12px] font-light leading-[1.6] text-[#fff7]">
        {skill.tagline}
      </p>

      {/* Learn more hint */}
      <div className="mt-3 flex items-center gap-1 text-[10px] font-medium text-[#fff4] transition-colors group-hover:text-[#fff9]">
        Learn more
        <ArrowRight
          size={10}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </div>
    </button>
  );
}

/* ── Main showcase ── */
export function SkillsShowcase() {
  const [activeSkill, setActiveSkill] = useState<SkillDetail | null>(null);

  return (
    <>
      <section id="skills" className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-normal tracking-tight text-white">
            What Aegis does
          </h2>
          <p className="mt-2 max-w-lg mx-auto text-[clamp(12px,0.85vw,14px)] font-light leading-[1.7] text-[#fff6]">
            Eight intelligent skills that connect your finances, health, education,
            and social presence — all surfaced through WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AEGIS_SKILLS.map((skill, i) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              index={i}
              onOpen={() => setActiveSkill(skill)}
            />
          ))}
        </div>
      </section>

      {/* Modal overlay */}
      {activeSkill && (
        <SkillModal
          skill={activeSkill}
          onClose={() => setActiveSkill(null)}
        />
      )}
    </>
  );
}
