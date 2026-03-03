'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import type { Group, Mesh } from 'three';

export function HeroEmblem() {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const { pointer } = useThree();

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    // Slow continuous rotation
    groupRef.current.rotation.y += delta * 0.25;
    // Mouse-follow tilt
    const tx = pointer.y * 0.2;
    const tz = pointer.x * 0.2;
    groupRef.current.rotation.x += (tx - groupRef.current.rotation.x) * 0.04;
    groupRef.current.rotation.z += (tz - groupRef.current.rotation.z) * 0.04;

    // Pulse the core emissive
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={groupRef}>
        {/* Core icosahedron */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.55, 1]} />
          <meshStandardMaterial
            color="#7c6aef"
            emissive="#7c6aef"
            emissiveIntensity={0.4}
            transparent
            opacity={0.85}
            wireframe
          />
        </mesh>

        {/* Inner solid core */}
        <mesh>
          <icosahedronGeometry args={[0.3, 1]} />
          <meshStandardMaterial
            color="#9b8df7"
            emissive="#7c6aef"
            emissiveIntensity={0.6}
            transparent
            opacity={0.5}
          />
        </mesh>

        {/* Orbit ring 1 — equator */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.9, 0.012, 16, 80]} />
          <meshStandardMaterial
            color="#7c6aef"
            emissive="#7c6aef"
            emissiveIntensity={0.3}
            transparent
            opacity={0.6}
          />
        </mesh>

        {/* Orbit ring 2 — tilted */}
        <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]}>
          <torusGeometry args={[0.75, 0.01, 16, 80]} />
          <meshStandardMaterial
            color="#7c6aef"
            emissive="#7c6aef"
            emissiveIntensity={0.3}
            transparent
            opacity={0.4}
          />
        </mesh>

        {/* Orbit ring 3 — opposite tilt */}
        <mesh rotation={[Math.PI / 2.5, -Math.PI / 3, Math.PI / 6]}>
          <torusGeometry args={[1.05, 0.008, 16, 80]} />
          <meshStandardMaterial
            color="#7c6aef"
            emissive="#7c6aef"
            emissiveIntensity={0.2}
            transparent
            opacity={0.35}
          />
        </mesh>

        {/* Central glow */}
        <pointLight color="#7c6aef" intensity={1.5} distance={4} decay={2} />
      </group>
    </Float>
  );
}

// Need THREE namespace for material typing
import * as THREE from 'three';
