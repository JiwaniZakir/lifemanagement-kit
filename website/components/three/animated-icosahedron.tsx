'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import type { Mesh } from 'three';

export function AnimatedIcosahedron() {
  const meshRef = useRef<Mesh>(null);
  const { pointer } = useThree();

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    // Slow rotation
    meshRef.current.rotation.y += delta * 0.15;
    meshRef.current.rotation.x += delta * 0.08;
    // Subtle mouse tilt
    meshRef.current.rotation.z += (pointer.x * 0.1 - meshRef.current.rotation.z) * 0.05;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[2, 1]} />
        <meshBasicMaterial
          color="#7c6aef"
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Inner glow sphere */}
      <mesh>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial
          color="#7c6aef"
          transparent
          opacity={0.04}
        />
      </mesh>
    </Float>
  );
}
