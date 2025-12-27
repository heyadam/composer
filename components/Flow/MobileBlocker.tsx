"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ExtrudedC() {
  const meshRef = useRef<THREE.Mesh>(null);
  const phase = useRef(0);

  const geometry = useMemo(() => {
    // Create C shape using arcs (same as AvyLogo)
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

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    phase.current += delta * 0.8;
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

/**
 * Full-screen blocker shown on mobile devices.
 * Renders via portal to escape any parent transforms that break fixed positioning.
 */
export function MobileBlocker() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100svh",
        minHeight: "-webkit-fill-available",
        zIndex: 99999,
      }}
      className="flex flex-col items-center justify-center bg-background px-8"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mobile-blocker-title"
      aria-describedby="mobile-blocker-desc"
    >
      {/* Logo */}
      <div className="mb-6" style={{ width: 120, height: 120 }}>
        <Canvas
          camera={{ position: [0, 0, 3], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[2, 4]}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, -5, -5]} intensity={0.3} />
          <ExtrudedC />
        </Canvas>
      </div>

      {/* Title */}
      <h1
        id="mobile-blocker-title"
        className="text-3xl font-medium tracking-wide text-white"
      >
        composer
      </h1>

      {/* Divider */}
      <div className="my-8 h-px w-16 bg-white/20" />

      {/* Message */}
      <p
        id="mobile-blocker-desc"
        className="max-w-[280px] text-center text-base text-muted-foreground"
      >
        Composer is designed for larger screens.
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground/70">
        Please visit on a desktop or laptop.
      </p>
    </div>,
    document.body
  );
}
