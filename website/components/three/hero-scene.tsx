'use client';

import { Canvas } from '@react-three/fiber';
import { SlicedSphere } from './sliced-sphere';

export function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        maxWidth: 900,
        maxHeight: 900,
        zIndex: -1,
        pointerEvents: 'auto',
      }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.15} />
      <SlicedSphere />
    </Canvas>
  );
}
