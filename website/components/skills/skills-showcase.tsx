'use client';

import {
  DollarSign,
  Calendar,
  GraduationCap,
  Heart,
  Share2,
  PenTool,
  Newspaper,
  Shield,
} from 'lucide-react';
import { AEGIS_SKILLS } from '@/lib/skills-data';
import type { LucideIcon } from 'lucide-react';

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

export function SkillsShowcase() {
  return (
    <section id="skills" className="mx-auto w-full max-w-4xl px-6 py-16">
      <div className="mb-8 text-center">
        <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-normal tracking-tight text-white">
          Capabilities
        </h2>
        <p className="mt-2 text-[clamp(12px,0.85vw,14px)] font-light leading-[1.7] text-[#fff6]">
          8 skills spanning finance, health, education, and social media
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AEGIS_SKILLS.map((skill, i) => {
          const Icon = ICON_MAP[skill.icon];
          return (
            <div
              key={skill.id}
              className="glass group cursor-default p-4 transition-all duration-200 hover:scale-[1.02] hover:border-[#ffffff26]"
              style={{
                animation: `fade-up 0.6s ease-out ${0.05 * i}s forwards`,
                opacity: 0,
              }}
            >
              {/* Icon + Name */}
              <div className="mb-2 flex items-center gap-2.5">
                {Icon && (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: `${skill.color}15` }}
                  >
                    <Icon size={16} style={{ color: skill.color }} />
                  </div>
                )}
                <h3 className="text-[14px] font-normal text-white">{skill.name}</h3>
              </div>

              {/* Description */}
              <p className="mb-3 text-[11px] font-light leading-[1.6] text-[#fff8]">
                {skill.description}
              </p>

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
          );
        })}
      </div>
    </section>
  );
}
