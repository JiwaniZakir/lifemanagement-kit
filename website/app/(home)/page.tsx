import { NavBar } from '@/components/hero/nav-bar';
import { HeroSection } from '@/components/hero/hero-section';
import { SkillsShowcase } from '@/components/skills/skills-showcase';
import { FeatureWizard } from '@/components/wizard/feature-wizard';

export default function HomePage() {
  return (
    <main className="hf0-type flex min-h-screen flex-col items-center justify-center bg-black">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <HeroSection />
        <SkillsShowcase />
        <FeatureWizard />
      </div>
      <NavBar />
    </main>
  );
}
