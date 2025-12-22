"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Shader code from AvyLogo
const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;

  uniform float uTime;
  uniform float uIntensity;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    float amp = 0.05 + uIntensity * 0.05;
    float wave1 = sin(position.x * 3.0 + uTime) * sin(position.y * 2.0 + uTime * 0.8);
    float wave2 = sin(position.z * 2.5 - uTime * 0.7) * 0.6;
    float pulseAmp = 0.01 + uIntensity * 0.015;
    float pulse = sin(uTime * 3.0) * pulseAmp + 1.0;
    vec3 displaced = position * pulse + normal * (wave1 + wave2) * amp;
    vPosition = displaced;
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;

  uniform float uTime;
  uniform float uIntensity;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);
    float fresnel = 1.0 - abs(dot(viewDir, normal));
    float edgeSharpness = 0.55 - uIntensity * 0.25;
    float edge = smoothstep(0.1, edgeSharpness, fresnel);
    vec3 cyan = vec3(0.133, 0.827, 0.933);
    vec3 purple = vec3(0.659, 0.333, 0.969);
    vec3 amber = vec3(0.961, 0.620, 0.043);
    float gradient = sin(vPosition.y * 2.0 + vPosition.x + uTime * 0.5) * 0.5 + 0.5;
    vec3 baseColor = mix(cyan, purple, gradient);
    float accentMix = sin(vPosition.z * 3.0 + uTime * 0.6) * 0.5 + 0.5;
    float amberAmount = 0.1 + uIntensity * 0.12;
    baseColor = mix(baseColor, amber, accentMix * amberAmount);
    vec3 gray = vec3(dot(baseColor, vec3(0.299, 0.587, 0.114)));
    float satBoost = 1.0 + uIntensity * 0.25;
    baseColor = mix(gray, baseColor, satBoost);
    vec3 edgeColor = mix(vec3(1.0), baseColor, 0.12 - uIntensity * 0.04);
    vec3 finalColor = mix(baseColor, edgeColor, edge);
    float interiorAlpha = (1.0 - fresnel * 0.4) * 0.6;
    float glowPulse = sin(uTime * 3.5) * 0.12 + 0.88;
    float finalAlpha = clamp(max(interiorAlpha, edge) * glowPulse + edge * 0.4, 0.0, 1.0);
    finalColor *= 1.0 + uIntensity * 0.12;
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

function FluidSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const phase = useRef(0);
  const rotationY = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0.3 },
    }),
    []
  );

  useFrame((_, delta) => {
    if (!meshRef.current || !materialRef.current) return;
    phase.current += delta * 0.8;
    materialRef.current.uniforms.uTime.value = phase.current;
    rotationY.current += delta * 0.15;
    meshRef.current.rotation.y = rotationY.current;
    meshRef.current.rotation.x = Math.sin(phase.current * 0.15) * 0.2;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
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
      {/* Orb */}
      <div className="mb-6" style={{ width: 120, height: 120 }}>
        <Canvas
          camera={{ position: [0, 0, 3.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[2, 4]}
          style={{ background: "transparent" }}
        >
          <FluidSphere />
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
