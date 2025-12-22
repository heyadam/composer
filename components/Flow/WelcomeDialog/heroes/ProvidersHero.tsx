"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { HeroPanel } from "./HeroPanel";
import {
  RoundedTile,
  CurvedLine,
  SvgIcon,
  GoogleIcon,
  ComposerIcon,
} from "../three";

/**
 * 3D hero showing provider icons flowing into the Composer icon.
 * Used on the API keys step of the welcome dialog.
 */
export function ProvidersHero() {
  const topY = 1.85;
  const bottomY = -2.05;
  const topX = [-2.25, 0, 2.25] as const;

  const composerPos = new THREE.Vector3(0, bottomY, 0);
  const openaiPos = new THREE.Vector3(topX[0], topY, 0);
  const googlePos = new THREE.Vector3(topX[1], topY, 0);
  const claudePos = new THREE.Vector3(topX[2], topY, 0);

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
          <CurvedLine
            from={new THREE.Vector3(openaiPos.x, openaiPos.y - 0.85, 0)}
            to={new THREE.Vector3(composerPos.x, composerPos.y + 0.9, 0)}
            color="#FFFFFF"
          />
          <CurvedLine
            from={new THREE.Vector3(googlePos.x, googlePos.y - 0.85, 0)}
            to={new THREE.Vector3(composerPos.x, composerPos.y + 0.9, 0)}
            color="#4285F4"
          />
          <CurvedLine
            from={new THREE.Vector3(claudePos.x, claudePos.y - 0.85, 0)}
            to={new THREE.Vector3(composerPos.x, composerPos.y + 0.9, 0)}
            color="#F97316"
          />

          {/* Provider tiles */}
          <RoundedTile position={[openaiPos.x, openaiPos.y, 0]}>
            <Suspense fallback={null}>
              <SvgIcon svgPath="/openai.svg" color="#FFFFFF" />
            </Suspense>
          </RoundedTile>
          <RoundedTile position={[googlePos.x, googlePos.y, 0]}>
            <GoogleIcon />
          </RoundedTile>
          <RoundedTile position={[claudePos.x, claudePos.y, 0]}>
            <Suspense fallback={null}>
              <SvgIcon svgPath="/claude.svg" fallbackColor="#F59E0B" />
            </Suspense>
          </RoundedTile>

          {/* Composer tile */}
          <RoundedTile position={[composerPos.x, composerPos.y, 0]} size={1.75}>
            <ComposerIcon />
          </RoundedTile>
        </Canvas>
      </div>
    </HeroPanel>
  );
}
