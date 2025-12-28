"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Hook to create the extruded C logo geometry.
 * Memoized to avoid recreating on every render.
 */
export function useCLogoGeometry() {
  return useMemo(() => {
    const outerRadius = 0.7;
    const innerRadius = 0.4;
    const startAngle = Math.PI * 0.35;
    const endAngle = Math.PI * 1.65;
    const segments = 32;

    const shape = new THREE.Shape();

    shape.moveTo(
      Math.cos(startAngle) * outerRadius,
      Math.sin(startAngle) * outerRadius
    );
    shape.absarc(0, 0, outerRadius, startAngle, endAngle, false);
    shape.lineTo(
      Math.cos(endAngle) * innerRadius,
      Math.sin(endAngle) * innerRadius
    );
    shape.absarc(0, 0, innerRadius, endAngle, startAngle, true);
    shape.lineTo(
      Math.cos(startAngle) * outerRadius,
      Math.sin(startAngle) * outerRadius
    );

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
}

interface CLogoMeshProps {
  /** Scale of the mesh (default: 1) */
  scale?: number;
  /** Whether the logo is in an active/panning state (speeds up animation) */
  isActive?: boolean;
}

/**
 * The 3D C logo mesh component.
 * Use this inside an existing Canvas/R3F scene.
 */
export function CLogoMesh({ scale = 1, isActive = false }: CLogoMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const phase = useRef(0);
  const intensity = useRef(0);
  const geometry = useCLogoGeometry();

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Intensity animation for active state
    const target = isActive ? 1 : 0;
    const lerpSpeed = isActive ? 10 : 2.5;
    intensity.current += (target - intensity.current) * Math.min(delta * lerpSpeed, 1);

    // Phase accumulation for oscillation
    const speed = 0.8 + intensity.current * 0.4;
    phase.current += delta * speed;

    // Oscillate back and forth by 25 degrees
    const maxAngle = 25 * (Math.PI / 180);
    meshRef.current.rotation.y = Math.sin(phase.current) * maxAngle;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} scale={scale}>
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

interface Logo3DProps {
  /** Size of the canvas in pixels (default: 40) */
  size?: number;
  /** Scale of the mesh within the canvas (default: 1) */
  scale?: number;
  /** Whether the logo is in an active/panning state */
  isActive?: boolean;
  /** Additional className for the container */
  className?: string;
}

/**
 * Complete 3D logo component with Canvas.
 * Use this for standalone logo rendering (header, mobile blocker, etc.)
 */
export function Logo3D({
  size = 40,
  scale = 1,
  isActive = false,
  className = "",
}: Logo3DProps) {
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[2, 4]}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />
        <CLogoMesh scale={scale} isActive={isActive} />
      </Canvas>
    </div>
  );
}
