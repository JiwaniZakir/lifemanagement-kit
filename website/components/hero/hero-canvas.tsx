'use client';

import { Canvas } from '@react-three/fiber';
import { HeroEmblem } from '@/components/three/hero-emblem';

export function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 40 }}
      style={{ width: 120, height: 120, background: 'transparent' }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.2} />
      <HeroEmblem />
    </Canvas>
  );
}
