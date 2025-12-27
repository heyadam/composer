"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Animated Composer logo: extruded 3D "C" letter with purple-blue glow.
 */
export function ComposerIcon() {
  const meshRef = useRef<THREE.Mesh>(null);
  const phase = useRef(0);

  const geometry = useMemo(() => {
    // Create C shape using arcs (same as AvyLogo)
    const outerRadius = 0.7;
    const innerRadius = 0.4;
    const startAngle = Math.PI * 0.35; // Opening angle top
    const endAngle = Math.PI * 1.65; // Opening angle bottom
    const segments = 32;

    const shape = new THREE.Shape();

    // Start at outer arc top
    shape.moveTo(
      Math.cos(startAngle) * outerRadius,
      Math.sin(startAngle) * outerRadius
    );

    // Draw outer arc (counterclockwise)
    shape.absarc(0, 0, outerRadius, startAngle, endAngle, false);

    // Line to inner arc bottom
    shape.lineTo(
      Math.cos(endAngle) * innerRadius,
      Math.sin(endAngle) * innerRadius
    );

    // Draw inner arc back (clockwise)
    shape.absarc(0, 0, innerRadius, endAngle, startAngle, true);

    // Close the shape
    shape.lineTo(
      Math.cos(startAngle) * outerRadius,
      Math.sin(startAngle) * outerRadius
    );

    // Extrude settings
    const extrudeSettings = {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelOffset: 0,
      bevelSegments: 3,
      curveSegments: segments,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center();

    return geom;
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Gentle oscillation
    phase.current += delta * 0.8;
    const maxAngle = 25 * (Math.PI / 180);
    meshRef.current.rotation.y = Math.sin(phase.current) * maxAngle;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow scale={0.65}>
      <meshStandardMaterial
        color="#ffffff"
        emissive="#4080ff"
        emissiveIntensity={0.3}
        metalness={0.5}
        roughness={0.3}
      />
    </mesh>
  );
}
