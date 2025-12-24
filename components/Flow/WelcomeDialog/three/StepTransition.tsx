"use client";

import { ReactNode, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { lerp } from "three/src/math/MathUtils.js";

type TransitionPreset = "fade" | "scale" | "slideUp" | "slideDown";

interface StepTransitionProps {
  /** Which step(s) this element should be visible on */
  visibleOn: 2 | 3 | "both";
  /** Current step */
  step: 2 | 3;
  /** Animation preset */
  preset?: TransitionPreset;
  /** Animation speed (0-1, higher = faster) */
  speed?: number;
  /** Position [x, y, z] */
  position?: [number, number, number];
  /** Children to render */
  children: ReactNode;
}

interface PresetConfig {
  hidden: { opacity: number; scale: number; offsetY: number };
  visible: { opacity: number; scale: number; offsetY: number };
}

const presets: Record<TransitionPreset, PresetConfig> = {
  fade: {
    hidden: { opacity: 0, scale: 1, offsetY: 0 },
    visible: { opacity: 1, scale: 1, offsetY: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.5, offsetY: 0 },
    visible: { opacity: 1, scale: 1, offsetY: 0 },
  },
  slideUp: {
    hidden: { opacity: 0, scale: 1, offsetY: -0.5 },
    visible: { opacity: 1, scale: 1, offsetY: 0 },
  },
  slideDown: {
    hidden: { opacity: 0, scale: 1, offsetY: 0.5 },
    visible: { opacity: 1, scale: 1, offsetY: 0 },
  },
};

/**
 * Wrapper for animating 3D elements between NUX steps.
 * Uses lerp-based animation with useFrame for smooth transitions.
 *
 * @example
 * <StepTransition visibleOn={2} step={step} preset="scale">
 *   <SvgIcon svgPath="/cursor.svg" />
 * </StepTransition>
 *
 * <StepTransition visibleOn={3} step={step} preset="slideUp">
 *   <mesh>...</mesh>
 * </StepTransition>
 */
export function StepTransition({
  visibleOn,
  step,
  preset = "scale",
  speed = 0.1,
  position = [0, 0, 0],
  children,
}: StepTransitionProps) {
  const groupRef = useRef<Group>(null);
  const isVisible = visibleOn === "both" || visibleOn === step;
  const config = presets[preset];
  const target = isVisible ? config.visible : config.hidden;

  // Track current animated values
  const currentRef = useRef({
    opacity: isVisible ? 1 : 0,
    scale: isVisible ? 1 : config.hidden.scale,
    offsetY: 0,
  });

  useFrame(() => {
    if (!groupRef.current) return;

    const current = currentRef.current;

    // Lerp towards target values
    current.opacity = lerp(current.opacity, target.opacity, speed);
    current.scale = lerp(current.scale, target.scale, speed);
    current.offsetY = lerp(current.offsetY, target.offsetY, speed);

    // Apply transforms
    groupRef.current.scale.setScalar(current.scale);
    groupRef.current.position.y = position[1] + current.offsetY;

    // Apply opacity to all meshes in the group
    groupRef.current.traverse((child) => {
      if ("material" in child && child.material) {
        const mat = child.material as { opacity?: number; transparent?: boolean };
        if (mat.opacity !== undefined) {
          mat.transparent = true;
          mat.opacity = current.opacity;
        }
      }
    });

    // Hide completely when fully invisible (optimization)
    groupRef.current.visible = current.opacity > 0.01;
  });

  return (
    <group ref={groupRef} position={position}>
      {children}
    </group>
  );
}
