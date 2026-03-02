import { NavBar } from '@/components/hero/nav-bar';
import { HeroSection } from '@/components/hero/hero-section';
import { PlannerChatbox } from '@/components/planner/planner-chatbox';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <HeroSection />
        <PlannerChatbox />
      </div>
      <NavBar />
    </main>
  );
}
