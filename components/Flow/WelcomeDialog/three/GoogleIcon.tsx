"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * Gemini sparkle icon: four-pointed star with gradient.
 */
export function GoogleIcon() {
  const starShape = useMemo(() => {
    const points = 4;
    const outerRadius = 0.45;
    const innerRadius = 0.16;

    const shape = new THREE.Shape();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    return shape;
  }, []);

  const gradientTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, "#A8C7FA");
    gradient.addColorStop(0.5, "#669DF6");
    gradient.addColorStop(1, "#4285F4");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  return (
    <group>
      <mesh>
        <shapeGeometry args={[starShape]} />
        <meshBasicMaterial map={gradientTexture} transparent />
      </mesh>
    </group>
  );
}
