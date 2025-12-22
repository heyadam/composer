"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface RoundedTileProps {
  position: [number, number, number];
  size?: number;
  children?: ReactNode;
}

/**
 * 3D tile with organic rotation animation.
 * Used to display provider icons in the welcome hero.
 */
export function RoundedTile({ position, size = 1.55, children }: RoundedTileProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // Unique rotation based on position for organic feel
    const time = clock.getElapsedTime();
    const offset = position[0] + position[1] * 2;
    const speedX = 1.2 + Math.sin(offset) * 0.4;
    const speedY = 1.0 + Math.cos(offset) * 0.3;
    const speedZ = 0.8 + Math.sin(offset * 1.5) * 0.2;

    groupRef.current.rotation.x = Math.sin(time * speedX + offset) * 0.25;
    groupRef.current.rotation.y = Math.cos(time * speedY + offset * 1.3) * 0.25;
    groupRef.current.rotation.z = Math.sin(time * speedZ + offset * 0.7) * 0.1;
  });

  const depth = 0.4;

  return (
    <group position={position} ref={groupRef}>
      {/* 3D Cube with better material */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size, size, depth]} />
        <meshStandardMaterial
          color="#1a1a1f"
          roughness={0.4}
          metalness={0.6}
          emissive="#0a0a0c"
          emissiveIntensity={0.2}
          transparent
          opacity={0.98}
        />
      </mesh>
      {/* Edge glow */}
      <mesh>
        <boxGeometry args={[size * 1.01, size * 1.01, depth * 1.01]} />
        <meshBasicMaterial color="#3a3a45" transparent opacity={0.3} wireframe />
      </mesh>
      {/* Rim light effect */}
      <mesh scale={1.005}>
        <boxGeometry args={[size, size, depth]} />
        <meshBasicMaterial color="#6366F1" transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>
      {/* Icons on front face */}
      <group position={[0, 0, depth / 2 + 0.02]}>{children}</group>
    </group>
  );
}
