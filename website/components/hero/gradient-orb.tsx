export function GradientOrb() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2">
      <div className="gradient-orb h-full w-full rounded-full bg-[radial-gradient(circle,_rgba(124,106,239,0.3)_0%,_rgba(90,77,191,0.15)_40%,_transparent_70%)] blur-[80px]" />
    </div>
  );
}
