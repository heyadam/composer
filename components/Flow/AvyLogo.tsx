"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface AvyLogoProps {
  isPanning?: boolean;
}

function ExtrudedC({ isPanning }: { isPanning?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const phase = useRef(0);
  const intensity = useRef(0);

  const geometry = useMemo(() => {
    // Create C shape using arcs
    const outerRadius = 0.7;
    const innerRadius = 0.4;
    const startAngle = Math.PI * 0.35;  // Opening angle top
    const endAngle = Math.PI * 1.65;    // Opening angle bottom
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
    // Center the geometry
    geom.center();

    return geom;
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Intensity animation
    const target = isPanning ? 1 : 0;
    const lerpSpeed = isPanning ? 10 : 2.5;
    intensity.current += (target - intensity.current) * Math.min(delta * lerpSpeed, 1);

    // Phase accumulation for oscillation
    const speed = 0.8 + intensity.current * 0.4;
    phase.current += delta * speed;

    // Oscillate back and forth by 25 degrees
    const maxAngle = 25 * (Math.PI / 180);
    meshRef.current.rotation.y = Math.sin(phase.current) * maxAngle;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
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

export function AvyLogo({ isPanning }: AvyLogoProps) {
  const iconSize = 40; // Match header button container size

  return (
    <div className="pointer-events-none select-none" style={{ width: iconSize, height: iconSize }}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[2, 4]}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />
        <ExtrudedC isPanning={isPanning} />
      </Canvas>
    </div>
  );
}
