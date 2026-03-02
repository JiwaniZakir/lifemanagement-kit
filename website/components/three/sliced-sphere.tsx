'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import type { Group } from 'three';

const RING_CONFIG = [
  { y: -1.2, radius: 1.6, rotation: 0, opacity: 0.55 },
  { y: -0.6, radius: 2.0, rotation: 0.3, opacity: 0.65 },
  { y: 0.0, radius: 2.2, rotation: 0.7, opacity: 0.8 },
  { y: 0.6, radius: 2.0, rotation: 1.1, opacity: 0.65 },
  { y: 1.2, radius: 1.6, rotation: 1.5, opacity: 0.55 },
  { y: -0.3, radius: 1.8, rotation: 2.0, opacity: 0.45 },
  { y: 0.3, radius: 1.8, rotation: 2.5, opacity: 0.45 },
];

export function SlicedSphere() {
  const groupRef = useRef<Group>(null);
  const { pointer } = useThree();

  const rings = useMemo(() => RING_CONFIG, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // Continuous Y rotation
    groupRef.current.rotation.y += delta * 0.1;
    // Mouse-follow lerp
    const targetX = pointer.y * 0.15;
    const targetZ = pointer.x * 0.15;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.03;
    groupRef.current.rotation.z += (targetZ - groupRef.current.rotation.z) * 0.03;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
      <group ref={groupRef}>
        {/* Sliced torus rings */}
        {rings.map((ring, i) => (
          <mesh
            key={i}
            position={[0, ring.y, 0]}
            rotation={[0, ring.rotation, 0]}
          >
            <torusGeometry args={[ring.radius, 0.03, 16, 100]} />
            <meshStandardMaterial
              color="#7c6aef"
              emissive="#7c6aef"
              emissiveIntensity={0.3}
              transparent
              opacity={ring.opacity}
            />
          </mesh>
        ))}

        {/* Central glow light */}
        <pointLight color="#7c6aef" intensity={2} distance={8} decay={2} />

        {/* Outer glow sphere */}
        <mesh>
          <sphereGeometry args={[3.0, 32, 32]} />
          <meshStandardMaterial
            color="#7c6aef"
            transparent
            opacity={0.03}
          />
        </mesh>
      </group>
    </Float>
  );
}
