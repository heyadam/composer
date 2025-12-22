"use client";

import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

interface SvgIconProps {
  /** Path to the SVG file (e.g., "/claude.svg") */
  svgPath: string;
  /** Override color for all shapes. If not provided, uses SVG colors or fallback. */
  color?: string;
  /** Fallback color if SVG has no fill color */
  fallbackColor?: string;
  /** Target size for the icon (default: 0.7) */
  targetSize?: number;
}

/**
 * Reusable 3D SVG icon component for Three.js scenes.
 * Loads an SVG file and renders it as 3D shapes.
 */
export function SvgIcon({
  svgPath,
  color,
  fallbackColor = "#FFFFFF",
  targetSize = 0.7,
}: SvgIconProps) {
  const svgData = useLoader(SVGLoader, svgPath);

  const shapes = useMemo(() => {
    if (!svgData || !svgData.paths) return [];

    const allShapes: { shape: THREE.Shape; color: string }[] = [];
    svgData.paths.forEach((path) => {
      const pathShapes = SVGLoader.createShapes(path);
      pathShapes.forEach((shape) => {
        // Use override color, or SVG color, or fallback
        const shapeColor = color
          ?? (path.color ? `#${path.color.getHexString()}` : fallbackColor);
        allShapes.push({ shape, color: shapeColor });
      });
    });
    return allShapes;
  }, [svgData, color, fallbackColor]);

  const { center, scale } = useMemo(() => {
    if (shapes.length === 0) {
      return { center: new THREE.Vector3(), scale: 1 };
    }

    const box = new THREE.Box3();
    shapes.forEach(({ shape }) => {
      const points = shape.getPoints();
      points.forEach((p) => box.expandByPoint(new THREE.Vector3(p.x, p.y, 0)));
    });
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y);
    const scale = maxDim > 0 ? targetSize / maxDim : 1;
    return { center, scale };
  }, [shapes, targetSize]);

  if (shapes.length === 0) return null;

  return (
    <group scale={[scale, -scale, 1]} position={[-center.x * scale, center.y * scale, 0]}>
      {shapes.map(({ shape, color }, i) => (
        <mesh key={i}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
