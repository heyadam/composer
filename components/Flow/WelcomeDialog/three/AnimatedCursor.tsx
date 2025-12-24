"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { SvgIcon } from "./SvgIcon";

interface DragState {
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
}

type MotionPattern = "figure8" | "circular" | "arc" | "zigzag";

/**
 * Cursor colors matching the CollaboratorCursors HSL palette (70% saturation, 55% lightness).
 * Using hex values for Three.js compatibility.
 */
export const CURSOR_COLORS = {
  red: "#E04646",      // hsl(0, 70%, 55%)
  coral: "#E07846",    // hsl(20, 70%, 55%)
  orange: "#E0A946",   // hsl(40, 70%, 55%)
  yellow: "#D8E046",   // hsl(55, 70%, 55%)
  lime: "#8CE046",     // hsl(90, 70%, 55%)
  green: "#46E07B",    // hsl(140, 70%, 55%)
  teal: "#46E0C4",     // hsl(170, 70%, 55%)
  cyan: "#46C4E0",     // hsl(190, 70%, 55%)
  blue: "#4678E0",     // hsl(220, 70%, 55%)
  purple: "#7846E0",   // hsl(260, 70%, 55%)
  magenta: "#C446E0",  // hsl(290, 70%, 55%)
  pink: "#E046A9",     // hsl(320, 70%, 55%)
} as const;

interface AnimatedCursorProps {
  /** Base position [x, y, z] */
  position: [number, number, number];
  /** Whether the cursor is visible/active */
  active: boolean;
  /** Callback to update drag state for the tile */
  onDragUpdate?: (state: DragState) => void;
  /** Time offset in seconds to stagger multiple cursors */
  timeOffset?: number;
  /** Duration of the animation cycle in seconds */
  cycleDuration?: number;
  /** Motion pattern for the drag phase */
  pattern?: MotionPattern;
  /** Scale of the drag motion */
  motionScale?: number;
  /** Cursor color (defaults to white) */
  color?: string;
}

/**
 * Calculate drag offset based on motion pattern.
 * All patterns start and end at (0, 0) for clean looping.
 */
function getPatternOffset(
  pattern: MotionPattern,
  t: number,
  scale: number
): { x: number; y: number } {
  const angle = t * Math.PI * 2;

  switch (pattern) {
    case "figure8":
      // Figure-8: sin(angle) for x, sin(2*angle) for y
      // At t=0 and t=1: sin(0) = sin(2π) = 0 ✓
      return {
        x: Math.sin(angle) * scale,
        y: Math.sin(angle * 2) * scale * 0.6,
      };
    case "circular":
      // Circular: use sin for both to start/end at origin
      // At t=0 and t=1: sin(0) = sin(2π) = 0 ✓
      return {
        x: Math.sin(angle) * scale,
        y: -Math.cos(angle) * scale * 0.7 + scale * 0.7,
      };
    case "arc":
      // Sweeping arc: smooth there-and-back motion
      // Uses sin which naturally returns to 0
      return {
        x: Math.sin(angle) * scale * 1.2,
        y: Math.sin(angle * 2) * scale * 0.3,
      };
    case "zigzag":
      // Triangle wave pattern that returns to origin
      // Split into 4 phases for smooth motion
      const phase = t * 4;
      const phaseIndex = Math.floor(phase) % 4;
      const phaseT = phase - Math.floor(phase);
      const ease = Math.sin(phaseT * Math.PI * 0.5); // ease in each segment

      switch (phaseIndex) {
        case 0: // Move right and up
          return { x: ease * scale, y: ease * scale * 0.4 };
        case 1: // Move left and down past origin
          return { x: scale - ease * scale * 2, y: scale * 0.4 - ease * scale * 0.8 };
        case 2: // Continue left, move up
          return { x: -scale + ease * scale, y: -scale * 0.4 + ease * scale * 0.8 };
        case 3: // Return to origin
          return { x: ease * 0, y: scale * 0.4 - ease * scale * 0.4 };
        default:
          return { x: 0, y: 0 };
      }
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Animated cursor that simulates clicking and dragging.
 * Loops through: approach → click → drag around → release → return
 */
export function AnimatedCursor({
  position,
  active,
  onDragUpdate,
  timeOffset = 0,
  cycleDuration = 4,
  pattern = "figure8",
  motionScale = 0.4,
  color = "#FFFFFF",
}: AnimatedCursorProps) {
  const groupRef = useRef<Group>(null);
  const clickRef = useRef<Group>(null);
  const timeRef = useRef(timeOffset);

  useFrame((_, delta) => {
    if (!groupRef.current || !clickRef.current) return;

    if (!active) {
      groupRef.current.visible = false;
      onDragUpdate?.({ offsetX: 0, offsetY: 0, isDragging: false });
      return;
    }

    groupRef.current.visible = true;
    timeRef.current += delta;

    const t = timeRef.current;
    const cycleT = (t % cycleDuration) / cycleDuration; // 0-1 within cycle

    // Animation phases (proportional to cycle):
    // 0.00-0.12: Approach (move to center of tile)
    // 0.12-0.20: Click (scale down then up)
    // 0.20-0.80: Drag (move in a pattern)
    // 0.80-0.88: Release (click up)
    // 0.88-1.00: Return to start

    let offsetX = 0;
    let offsetY = 0;
    let clickScale = 1;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let isDragging = false;

    if (cycleT < 0.12) {
      // Approach: ease in from starting position to tile center
      const p = cycleT / 0.12;
      const ease = 1 - Math.pow(1 - p, 3); // ease out cubic
      offsetX = -0.3 * (1 - ease);
      offsetY = 0.3 * (1 - ease);
    } else if (cycleT < 0.20) {
      // Click down then up
      const p = (cycleT - 0.12) / 0.08;
      if (p < 0.5) {
        clickScale = 1 - 0.15 * (p * 2); // scale down
      } else {
        clickScale = 0.85 + 0.15 * ((p - 0.5) * 2); // scale back up
      }
    } else if (cycleT < 0.80) {
      // Drag: use pattern function
      const dragT = (cycleT - 0.20) / 0.60;
      const patternOffset = getPatternOffset(pattern, dragT, motionScale);
      offsetX = patternOffset.x;
      offsetY = patternOffset.y;
      dragOffsetX = offsetX;
      dragOffsetY = offsetY;
      isDragging = true;
      clickScale = 0.92; // slightly pressed while dragging
    } else if (cycleT < 0.88) {
      // Release click
      const p = (cycleT - 0.80) / 0.08;
      clickScale = 0.92 + 0.08 * p; // scale back to 1
      isDragging = false;
    } else {
      // Return to starting position
      const p = (cycleT - 0.88) / 0.12;
      const ease = 1 - Math.pow(1 - p, 3);
      offsetX = -0.3 * ease;
      offsetY = 0.3 * ease;
    }

    // Apply position
    groupRef.current.position.x = position[0] + offsetX;
    groupRef.current.position.y = position[1] + offsetY;
    groupRef.current.position.z = position[2];

    // Apply click scale
    clickRef.current.scale.setScalar(clickScale);

    // Update drag state for the tile
    onDragUpdate?.({ offsetX: dragOffsetX, offsetY: dragOffsetY, isDragging });
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={clickRef}>
        <SvgIcon svgPath="/mouse-cursor.svg" targetSize={0.5} color={color} />
      </group>
    </group>
  );
}
