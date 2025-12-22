"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface AvyLogoProps {
  isPanning?: boolean;
  canvasWidth?: number;
}

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;

  uniform float uTime;
  uniform float uIntensity;

  void main() {
    vNormal = normalize(normalMatrix * normal);

    // Displacement picks up when active
    float amp = 0.05 + uIntensity * 0.05;

    // Organic wave displacement (speed handled by phase accumulation)
    float wave1 = sin(position.x * 3.0 + uTime) * sin(position.y * 2.0 + uTime * 0.8);
    float wave2 = sin(position.z * 2.5 - uTime * 0.7) * 0.6;

    // Breathing pulse
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

    // Fresnel for edge glow - blazes when active
    float fresnel = 1.0 - abs(dot(viewDir, normal));
    float edgeSharpness = 0.55 - uIntensity * 0.25;
    float edge = smoothstep(0.1, edgeSharpness, fresnel);

    // App theme colors
    vec3 cyan = vec3(0.133, 0.827, 0.933);    // #22d3ee
    vec3 purple = vec3(0.659, 0.333, 0.969);  // #a855f7
    vec3 amber = vec3(0.961, 0.620, 0.043);   // #f59e0b

    // Gradient (speed handled by phase accumulation)
    float gradient = sin(vPosition.y * 2.0 + vPosition.x + uTime * 0.5) * 0.5 + 0.5;
    vec3 baseColor = mix(cyan, purple, gradient);

    // Amber accent warms up when active
    float accentMix = sin(vPosition.z * 3.0 + uTime * 0.6) * 0.5 + 0.5;
    float amberAmount = 0.1 + uIntensity * 0.12;
    baseColor = mix(baseColor, amber, accentMix * amberAmount);

    // Saturation lifts when active
    vec3 gray = vec3(dot(baseColor, vec3(0.299, 0.587, 0.114)));
    float satBoost = 1.0 + uIntensity * 0.25;
    baseColor = mix(gray, baseColor, satBoost);

    // Edge glow brightens when active
    vec3 edgeColor = mix(vec3(1.0), baseColor, 0.12 - uIntensity * 0.04);
    vec3 finalColor = mix(baseColor, edgeColor, edge);

    // Alpha with pulsing glow
    float interiorAlpha = (1.0 - fresnel * 0.4) * 0.6;
    float glowPulse = sin(uTime * 3.5) * 0.12 + 0.88;
    float finalAlpha = clamp(max(interiorAlpha, edge) * glowPulse + edge * 0.4, 0.0, 1.0);

    // Brightness lifts when active
    finalColor *= 1.0 + uIntensity * 0.12;

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

function FluidSphere({ isPanning }: { isPanning?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const intensity = useRef(0);
  const phase = useRef(0);
  const rotationY = useRef(0);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
  }), []);

  useFrame((_, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    // Snap awake, smooth fade
    const target = isPanning ? 1 : 0;
    const lerpSpeed = isPanning ? 10 : 2.5;
    intensity.current += (target - intensity.current) * Math.min(delta * lerpSpeed, 1);
    materialRef.current.uniforms.uIntensity.value = intensity.current;

    // Accumulate phase - speed changes only affect future frames, no jumps
    const speed = 1.0 + intensity.current * 1.0;
    phase.current += delta * speed;
    materialRef.current.uniforms.uTime.value = phase.current;

    // Accumulate rotation smoothly
    const rotSpeed = 0.2 + intensity.current * 0.25;
    rotationY.current += delta * rotSpeed;
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

export function AvyLogo({ isPanning, canvasWidth }: AvyLogoProps) {
  const isCompact = canvasWidth !== undefined && canvasWidth <= 800;
  const iconSize = isCompact ? 32 : 48;
  const textSize = isCompact ? "text-base" : "text-lg";
  
  return (
    <div className="flex items-center gap-2 pointer-events-none select-none">
      <div style={{ width: iconSize, height: iconSize }}>
        <Canvas
          camera={{ position: [0, 0, 3.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[2, 4]}
          style={{ background: "transparent" }}
        >
          <FluidSphere isPanning={isPanning} />
        </Canvas>
      </div>
      <span className={`text-white font-medium ${textSize} tracking-wide`}>composer</span>
    </div>
  );
}
