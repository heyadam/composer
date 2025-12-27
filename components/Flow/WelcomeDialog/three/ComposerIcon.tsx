"use client";

import { CLogoMesh } from "@/components/Logo3D";

/**
 * Animated Composer logo: extruded 3D "C" letter with purple-blue glow.
 * For use inside an existing R3F Canvas/scene.
 */
export function ComposerIcon() {
  return <CLogoMesh scale={0.65} />;
}
