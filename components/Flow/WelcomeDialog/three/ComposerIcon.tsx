"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Animated Composer logo: pulsing white sphere with purple-blue glow.
 */
export function ComposerIcon() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    // Smooth pulsing: scale between 0.95 and 1.05
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.05;
    meshRef.current.scale.setScalar(pulse);

    // Sync glow with main sphere
    if (glowRef.current) {
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* Purple-blue glow layers */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.68, 32, 32]} />
        <meshBasicMaterial color="#8B5CF6" transparent opacity={0.15} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.58, 32, 32]} />
        <meshBasicMaterial color="#6366F1" transparent opacity={0.25} />
      </mesh>
      {/* Main white sphere */}
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.48, 32, 32]} />
        <meshStandardMaterial
          color="#FFFFFF"
          roughness={0.3}
          metalness={0.1}
          emissive="#ffffff"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}
