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

export function ShippedFeatures() {
  return (
    <div>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#fff6]">
        Shipped capabilities
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {AEGIS_SKILLS.map((skill) => {
          const Icon = ICON_MAP[skill.icon];
          return (
            <div
              key={skill.id}
              className="glass flex shrink-0 items-center gap-2 px-3 py-2"
            >
              {Icon && <Icon size={14} style={{ color: skill.color }} />}
              <span className="text-[12px] font-light text-white">{skill.name}</span>
              <span className="rounded-full border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[8px] font-medium uppercase text-green-400">
                Shipped
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
