import { NavBar } from '@/components/hero/nav-bar';

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hf0-type min-h-screen bg-black">
      {children}
      <NavBar />
    </div>
  );
}
