"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface AvyLogoProps {
  isPanning?: boolean;
  panDelta?: { x: number; y: number };
}

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;

  uniform float uTime;
  uniform float uIntensity;

  // Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // Speed multiplier based on intensity (subtly faster when panning)
    float speedMult = 1.0 + uIntensity * 0.3;

    // Funky liquid displacement - slightly more active when panning
    float noise1 = snoise(position * 2.5 + uTime * 0.8 * speedMult);
    float noise2 = snoise(position * 3.5 - uTime * 0.6 * speedMult);
    float noise3 = snoise(position * 1.5 + vec3(uTime * 0.5 * speedMult, uTime * 0.3 * speedMult, uTime * 0.4 * speedMult));

    // Add pulsing effect - slightly stronger when panning
    float pulseAmp = 0.02 + uIntensity * 0.02;
    float pulse = sin(uTime * 2.0 * speedMult) * pulseAmp + 1.0;

    // Wobbly displacement - slightly stronger when panning
    float wobbleAmp = 0.03 + uIntensity * 0.006;
    float wobble = sin(position.y * 4.0 + uTime * 3.0 * speedMult) * wobbleAmp;

    // Displacement amplitude increases slightly with intensity
    float dispMult = 1.0 + uIntensity * 0.4;
    vec3 displaced = position * pulse + normal * (noise1 * 0.12 * dispMult + noise2 * 0.08 * dispMult + noise3 * 0.06 * dispMult + wobble);
    vPosition = displaced;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;

  uniform float uTime;
  uniform float uIntensity;

  // HSV to RGB conversion
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);

    // Speed multiplier for color animation (subtle)
    float speedMult = 1.0 + uIntensity * 0.3;

    // Fresnel for edge detection
    float fresnel = 1.0 - abs(dot(viewDir, normal));

    // Create white outline at edges
    float edgeWidth = 0.6;
    float edgeSoftness = 0.4;
    float edge = smoothstep(edgeWidth - edgeSoftness, edgeWidth + edgeSoftness * 0.3, fresnel);

    // Rainbow hue shifting based on position and time - slightly faster when panning
    float hueShift = uTime * 0.15 * speedMult;
    float hue1 = fract(vPosition.x * 0.5 + vPosition.y * 0.3 + hueShift);
    float hue2 = fract(vPosition.z * 0.4 - vPosition.x * 0.2 + hueShift + 0.33);

    // Vibrant saturated colors
    vec3 color1 = hsv2rgb(vec3(hue1, 0.9, 0.95));
    vec3 color2 = hsv2rgb(vec3(hue2, 0.85, 1.0));

    // Neon accent colors
    vec3 neonPink = vec3(1.0, 0.2, 0.6);
    vec3 neonCyan = vec3(0.2, 1.0, 0.9);
    vec3 neonPurple = vec3(0.7, 0.2, 1.0);

    // Swirling color mix - slightly faster when panning
    float swirl = sin(vPosition.x * 3.0 + vPosition.y * 2.0 + uTime * 1.5 * speedMult) * 0.5 + 0.5;
    float swirl2 = cos(vPosition.z * 4.0 - uTime * 2.0 * speedMult) * 0.5 + 0.5;

    // Mix rainbow with neon accents
    vec3 liquidColor = mix(color1, color2, swirl);
    liquidColor = mix(liquidColor, neonPink, swirl2 * 0.4);
    liquidColor = mix(liquidColor, neonCyan, sin(uTime * 1.2 * speedMult + vUv.x * 3.14) * 0.3);
    liquidColor = mix(liquidColor, neonPurple, cos(uTime * 0.8 * speedMult + vUv.y * 3.14) * 0.25);

    // Boost saturation
    liquidColor = pow(liquidColor, vec3(0.85));

    // White edge with slight color tint
    vec3 edgeColor = mix(vec3(1.0), liquidColor, 0.15);

    // Interior alpha - more visible now
    float interiorAlpha = (1.0 - fresnel * 0.7) * 0.5;
    float edgeAlpha = edge;

    // Final blend
    vec3 finalColor = mix(liquidColor, edgeColor, edge);
    float finalAlpha = max(interiorAlpha, edgeAlpha);

    // Pulsing glow - slightly faster when panning
    float glowPulse = sin(uTime * 3.0 * speedMult) * 0.1 + 0.9;
    finalAlpha *= glowPulse;
    finalAlpha = clamp(finalAlpha + edge * 0.4, 0.0, 1.0);

    // Subtle brightness boost when panning
    finalColor *= (1.0 + uIntensity * 0.08);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

function FluidSphere({ isPanning, panDelta }: { isPanning?: boolean; panDelta?: { x: number; y: number } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const targetIntensity = useRef(0);
  const currentIntensity = useRef(0);
  const panRotationY = useRef(0);
  const panRotationX = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0 },
    }),
    []
  );

  useFrame((state, delta) => {
    if (meshRef.current && materialRef.current) {
      const t = state.clock.elapsedTime;
      materialRef.current.uniforms.uTime.value = t;

      // Smoothly interpolate intensity towards target
      targetIntensity.current = isPanning ? 1 : 0;
      const lerpSpeed = isPanning ? 8 : 4; // Faster ramp up, slower ramp down
      currentIntensity.current += (targetIntensity.current - currentIntensity.current) * Math.min(delta * lerpSpeed, 1);
      materialRef.current.uniforms.uIntensity.value = currentIntensity.current;

      // Add pan-direction rotation (pan delta affects rotation)
      const panSensitivity = 0.008;
      if (isPanning && panDelta) {
        panRotationY.current += panDelta.x * panSensitivity;
        panRotationX.current += panDelta.y * panSensitivity;
      }
      // Slowly decay pan rotation when not panning
      panRotationY.current *= 0.98;
      panRotationX.current *= 0.98;

      // Base rotation plus pan-induced rotation
      const baseRotY = t * 0.3;
      const baseRotX = Math.sin(t * 0.2) * 0.3;
      const baseRotZ = Math.cos(t * 0.15) * 0.1;

      meshRef.current.rotation.y = baseRotY + panRotationY.current;
      meshRef.current.rotation.x = baseRotX + panRotationX.current;
      meshRef.current.rotation.z = baseRotZ;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function AvyLogo({ isPanning, panDelta }: AvyLogoProps) {
  return (
    <div className="flex items-center gap-2 pointer-events-none select-none">
      <div style={{ width: 48, height: 48 }}>
        <Canvas
          camera={{ position: [0, 0, 3.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[2, 4]}
          style={{ background: "transparent" }}
        >
          <FluidSphere isPanning={isPanning} panDelta={panDelta} />
        </Canvas>
      </div>
      <span className="text-white font-medium text-xl tracking-wide">avy</span>
    </div>
  );
}
