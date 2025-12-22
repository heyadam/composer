"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CurvedLineProps {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
}

/**
 * Animated curved line with flowing particle effect.
 * Draws a bezier curve between two points with a glowing particle that travels along it.
 */
export function CurvedLine({ from, to, color }: CurvedLineProps) {
  const particleRef = useRef<THREE.Mesh>(null);

  const { curve, tubeGeometry } = useMemo(() => {
    const mid = new THREE.Vector3((from.x + to.x) / 2, (from.y + to.y) / 2, 0);
    mid.y += 0.9;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const tubeGeometry = new THREE.TubeGeometry(curve, 48, 0.035, 8, false);
    return { curve, tubeGeometry };
  }, [from, to]);

  useFrame(({ clock }) => {
    if (!particleRef.current) return;
    // Animate particle along the curve from 0 to 1
    const t = (clock.getElapsedTime() * 0.3) % 1;
    const point = curve.getPoint(t);
    particleRef.current.position.copy(point);

    // Scale: grow from 0 at start, shrink to 0 at end
    let scale = 1;
    if (t < 0.15) {
      scale = t / 0.15;
    } else if (t > 0.85) {
      scale = (1 - t) / 0.15;
    }
    particleRef.current.scale.setScalar(scale);
  });

  return (
    <group>
      {/* Main line */}
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      {/* Animated flow particle with glow */}
      <mesh ref={particleRef}>
        {/* Outer glow */}
        <mesh>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.25} />
        </mesh>
        {/* Main particle */}
        <mesh>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </mesh>
    </group>
  );
}
