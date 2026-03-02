import { NavBar } from '@/components/hero/nav-bar';
import { HeroSection } from '@/components/hero/hero-section';
import { PlannerChatbox } from '@/components/planner/planner-chatbox';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <NavBar />
      <HeroSection />
      <PlannerChatbox />
    </main>
  );
}
