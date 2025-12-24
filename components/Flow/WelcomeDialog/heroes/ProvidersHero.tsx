"use client";

import { Suspense, useRef, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Group, Mesh, TubeGeometry, QuadraticBezierCurve3 } from "three";
import { HeroPanel } from "./HeroPanel";
import {
  RoundedTile,
  CurvedLine,
  SvgIcon,
  GoogleIcon,
  ComposerIcon,
  AnimatedCursor,
  CURSOR_COLORS,
} from "../three";

interface ProvidersHeroProps {
  step: 2 | 3;
}

// Scene positions
const topY = 1.85;
const bottomY = -2.05;
const topX = [-2.25, 0, 2.25] as const;

const composerPos = new THREE.Vector3(0, bottomY, 0);
const openaiPos = new THREE.Vector3(topX[0], topY, 0);
const googlePos = new THREE.Vector3(topX[1], topY, 0);
const claudePos = new THREE.Vector3(topX[2], topY, 0);

interface SceneContentProps {
  step: 2 | 3;
}

interface DragOffset {
  x: number;
  y: number;
  isDragging: boolean;
}

/**
 * Dynamic curved line that updates its start point based on drag offset.
 */
function DynamicLine({
  dragOffsetRef,
  baseFrom,
  to,
  color,
}: {
  dragOffsetRef: React.RefObject<DragOffset>;
  baseFrom: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
}) {
  const tubeRef = useRef<Mesh>(null);
  const particleRef = useRef<Mesh>(null);
  const curveRef = useRef<QuadraticBezierCurve3 | null>(null);

  useFrame(({ clock }) => {
    if (!tubeRef.current) return;

    const offset = dragOffsetRef.current;
    const fromX = baseFrom.x + (offset?.x ?? 0);
    const fromY = baseFrom.y + (offset?.y ?? 0);
    const from = new THREE.Vector3(fromX, fromY, 0);

    // Rebuild curve and geometry
    const mid = new THREE.Vector3((from.x + to.x) / 2, (from.y + to.y) / 2, 0);
    mid.y += 0.9;
    const curve = new QuadraticBezierCurve3(from, mid, to);
    curveRef.current = curve;

    const newGeometry = new TubeGeometry(curve, 48, 0.035, 8, false);
    tubeRef.current.geometry.dispose();
    tubeRef.current.geometry = newGeometry;

    // Animate particle along the curve
    if (particleRef.current && curveRef.current) {
      const t = (clock.getElapsedTime() * 0.3) % 1;
      const point = curveRef.current.getPoint(t);
      particleRef.current.position.copy(point);

      let scale = 1;
      if (t < 0.15) {
        scale = t / 0.15;
      } else if (t > 0.85) {
        scale = (1 - t) / 0.15;
      }
      particleRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group>
      <mesh ref={tubeRef}>
        <tubeGeometry args={[new QuadraticBezierCurve3(baseFrom, baseFrom, to), 48, 0.035, 8, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      <mesh ref={particleRef}>
        <mesh>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.25} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </mesh>
    </group>
  );
}

/**
 * Pick two random different colors from CURSOR_COLORS
 */
function getRandomCursorColors(): [string, string] {
  const colorKeys = Object.keys(CURSOR_COLORS) as (keyof typeof CURSOR_COLORS)[];
  const firstIndex = Math.floor(Math.random() * colorKeys.length);
  let secondIndex = Math.floor(Math.random() * (colorKeys.length - 1));
  if (secondIndex >= firstIndex) secondIndex++; // Ensure different from first

  return [CURSOR_COLORS[colorKeys[firstIndex]], CURSOR_COLORS[colorKeys[secondIndex]]];
}

/**
 * Scene content that needs to use refs inside the Canvas
 */
function SceneContent({ step }: SceneContentProps) {
  const claudeTileRef = useRef<Group>(null);
  const openaiTileRef = useRef<Group>(null);
  const claudeDragRef = useRef<DragOffset>({ x: 0, y: 0, isDragging: false });
  const openaiDragRef = useRef<DragOffset>({ x: 0, y: 0, isDragging: false });

  // Randomize cursor colors on mount
  const [openaiColor, claudeColor] = useMemo(() => getRandomCursorColors(), []);

  const handleClaudeDragUpdate = useCallback(
    (state: { offsetX: number; offsetY: number; isDragging: boolean }) => {
      claudeDragRef.current = { x: state.offsetX, y: state.offsetY, isDragging: state.isDragging };

      if (claudeTileRef.current) {
        claudeTileRef.current.position.x = claudePos.x + state.offsetX;
        claudeTileRef.current.position.y = claudePos.y + state.offsetY;
        claudeTileRef.current.position.z = state.isDragging ? 0.3 : 0;
      }
    },
    []
  );

  const handleOpenaiDragUpdate = useCallback(
    (state: { offsetX: number; offsetY: number; isDragging: boolean }) => {
      openaiDragRef.current = { x: state.offsetX, y: state.offsetY, isDragging: state.isDragging };

      if (openaiTileRef.current) {
        openaiTileRef.current.position.x = openaiPos.x + state.offsetX;
        openaiTileRef.current.position.y = openaiPos.y + state.offsetY;
        openaiTileRef.current.position.z = state.isDragging ? 0.3 : 0;
      }
    },
    []
  );

  // Memoize line endpoints
  const composerTop = useMemo(
    () => new THREE.Vector3(composerPos.x, composerPos.y + 0.9, 0),
    []
  );
  const claudeLineFrom = useMemo(
    () => new THREE.Vector3(claudePos.x, claudePos.y - 0.85, 0),
    []
  );
  const openaiLineFrom = useMemo(
    () => new THREE.Vector3(openaiPos.x, openaiPos.y - 0.85, 0),
    []
  );

  return (
    <>
      {/* Soft, diffused lighting */}
      <ambientLight intensity={0.8} />
      <hemisphereLight args={["#6366F1", "#1a1a1f", 0.6]} />
      {/* Main shadow-casting light from above/front */}
      <directionalLight
        position={[1, 4, 8]}
        target-position={[0, 0, 0]}
        intensity={0.8}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
        shadow-radius={12}
      />
      {/* Fill lights for ambient look */}
      <directionalLight position={[5, 3, 5]} intensity={0.3} color="#8B5CF6" />
      <directionalLight position={[-5, -2, 5]} intensity={0.25} color="#4285F4" />
      <pointLight position={[0, 0, 6]} intensity={0.2} distance={15} decay={2} />

      {/* Shadow-receiving plane behind cubes */}
      <mesh position={[0, 0, -0.5]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial transparent opacity={0.25} color="#000000" />
      </mesh>

      {/* Lines (behind) */}
      <DynamicLine
        dragOffsetRef={openaiDragRef}
        baseFrom={openaiLineFrom}
        to={composerTop}
        color="#FFFFFF"
      />
      <CurvedLine
        from={new THREE.Vector3(googlePos.x, googlePos.y - 0.85, 0)}
        to={new THREE.Vector3(composerPos.x, composerPos.y + 0.9, 0)}
        color="#4285F4"
      />
      <DynamicLine
        dragOffsetRef={claudeDragRef}
        baseFrom={claudeLineFrom}
        to={composerTop}
        color="#F97316"
      />

      {/* Provider tiles */}
      <group ref={openaiTileRef} position={[openaiPos.x, openaiPos.y, 0]}>
        <RoundedTile position={[0, 0, 0]}>
          <Suspense fallback={null}>
            <SvgIcon svgPath="/openai.svg" color="#FFFFFF" />
          </Suspense>
        </RoundedTile>
      </group>
      <RoundedTile position={[googlePos.x, googlePos.y, 0]}>
        <GoogleIcon />
      </RoundedTile>
      <group ref={claudeTileRef} position={[claudePos.x, claudePos.y, 0]}>
        <RoundedTile position={[0, 0, 0]}>
          <Suspense fallback={null}>
            <SvgIcon svgPath="/claude.svg" fallbackColor="#F59E0B" />
          </Suspense>
        </RoundedTile>
      </group>

      {/* Composer tile */}
      <RoundedTile position={[composerPos.x, composerPos.y, 0]} size={1.75}>
        <ComposerIcon />
      </RoundedTile>

      {/* Mouse cursors (step 2 only) */}
      <Suspense fallback={null}>
        <AnimatedCursor
          position={[openaiPos.x + 0.6, openaiPos.y - 0.6, 1.5]}
          active={step === 2}
          onDragUpdate={handleOpenaiDragUpdate}
          timeOffset={1.5}
          cycleDuration={5}
          pattern="arc"
          motionScale={0.5}
          color={openaiColor}
        />
        <AnimatedCursor
          position={[claudePos.x + 0.6, claudePos.y - 0.6, 1.5]}
          active={step === 2}
          onDragUpdate={handleClaudeDragUpdate}
          cycleDuration={3.5}
          pattern="circular"
          motionScale={0.35}
          color={claudeColor}
        />
      </Suspense>
    </>
  );
}

/**
 * 3D hero showing provider icons flowing into the Composer icon.
 * Used on the API keys step of the welcome dialog.
 */
export function ProvidersHero({ step }: ProvidersHeroProps) {
  return (
    <HeroPanel>
      <div className="pointer-events-none absolute inset-0 z-20">
        <Canvas
          orthographic
          camera={{ position: [0, 0, 10], zoom: 48 }}
          dpr={[1, 2]}
          frameloop="always"
          gl={{ antialias: true, alpha: true }}
          shadows
        >
          <SceneContent step={step} />
        </Canvas>
      </div>
    </HeroPanel>
  );
}
